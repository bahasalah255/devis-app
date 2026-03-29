<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class DevisAiParser
{
    public function isEnabled(): bool
    {
        return $this->isAnthropicEnabled();
    }

    public function isAnthropicEnabled(): bool
    {
        return (string) config('services.anthropic.key', '') !== '';
    }

    public function isOpenAiEnabled(): bool
    {
        return (string) config('services.openai.key', '') !== '';
    }

    public function extractDevisLignes(string $rawText): array
    {
        $result = $this->extractDevisLignesWithFallback($rawText);
        return $result['lines'];
    }

    public function extractDevisLignesWithFallback(string $rawText): array
    {
        $text = trim($rawText);
        if ($text === '') {
            return ['lines' => [], 'source' => null, 'detail' => 'Texte vide.'];
        }

        $attemptErrors = [];

        if ($this->isAnthropicEnabled()) {
            try {
                $anthropicLines = $this->extractDevisLignesFromText($text);
                if (!empty($anthropicLines)) {
                    return ['lines' => $anthropicLines, 'source' => 'anthropic', 'detail' => null];
                }
                $attemptErrors[] = 'Anthropic: réponse vide';
            } catch (Throwable $e) {
                // Step 1 failed -> fallback to OpenAI
                $attemptErrors[] = 'Anthropic: ' . $this->messageFromThrowable($e);
            }
        } else {
            $attemptErrors[] = 'Anthropic: clé API manquante';
        }

        if ($this->isOpenAiEnabled()) {
            try {
                $openAiLines = $this->extractDevisLignesFromOpenAi($text);
                if (!empty($openAiLines)) {
                    return ['lines' => $openAiLines, 'source' => 'openai', 'detail' => null];
                }
                $attemptErrors[] = 'OpenAI: réponse vide';
            } catch (Throwable $e) {
                // Step 2 failed -> fallback to local regex parser
                $attemptErrors[] = 'OpenAI: ' . $this->messageFromThrowable($e);
            }
        } else {
            $attemptErrors[] = 'OpenAI: clé API manquante';
        }

        return [
            'lines' => [],
            'source' => null,
            'detail' => implode(' | ', array_filter($attemptErrors)),
        ];
    }

    public function extractDevisLignesFromText(string $rawText): array
    {
        if (!$this->isAnthropicEnabled()) {
            return [];
        }

        $text = trim($rawText);
        if ($text === '') {
            return [];
        }

        $response = Http::timeout((int) config('services.anthropic.timeout', 45))
            ->withHeaders([
                'x-api-key' => (string) config('services.anthropic.key'),
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => (string) config('services.anthropic.model', 'claude-sonnet-4-20250514'),
                'max_tokens' => 3500,
                'temperature' => 0,
                'system' => $this->systemPrompt(),
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => "Texte source à analyser:\n\n" . mb_substr($text, 0, 120000),
                            ],
                        ],
                    ],
                ],
            ]);

        return $this->decodeAnthropicResponse($response->status(), $response->successful(), $response->json());
    }

    public function extractDevisLignesFromOpenAi(string $rawText): array
    {
        if (!$this->isOpenAiEnabled()) {
            return [];
        }

        $text = trim($rawText);
        if ($text === '') {
            return [];
        }

        $response = Http::timeout((int) config('services.openai.timeout', 45))
            ->withHeaders([
                'Authorization' => 'Bearer ' . (string) config('services.openai.key'),
                'content-type' => 'application/json',
            ])
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => (string) config('services.openai.model', 'gpt-4o-mini'),
                'temperature' => 0,
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    [
                        'role' => 'user',
                        'content' => "Texte source à analyser:\n\n" . mb_substr($text, 0, 120000),
                    ],
                ],
            ]);

        return $this->decodeOpenAiResponse($response->status(), $response->successful(), $response->json());
    }

    public function extractDevisLignesFromImage(string $imageBase64, string $mimeType): array
    {
        if (!$this->isAnthropicEnabled()) {
            return [];
        }

        $payload = trim($imageBase64);
        if ($payload === '') {
            return [];
        }

        $cleaned = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/i', '', $payload) ?? $payload;
        $mediaType = $this->normalizeImageMimeType($mimeType);
        if ($mediaType === null) {
            throw new RuntimeException('Format image non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
        }

        $response = Http::timeout((int) config('services.anthropic.timeout', 45))
            ->withHeaders([
                'x-api-key' => (string) config('services.anthropic.key'),
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => (string) config('services.anthropic.model', 'claude-sonnet-4-20250514'),
                'max_tokens' => 3500,
                'temperature' => 0,
                'system' => $this->systemPrompt(),
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'image',
                                'source' => [
                                    'type' => 'base64',
                                    'media_type' => $mediaType,
                                    'data' => $cleaned,
                                ],
                            ],
                            [
                                'type' => 'text',
                                'text' => 'Analyse uniquement le tableau des produits et ignore tous les autres blocs.',
                            ],
                        ],
                    ],
                ],
            ]);

        return $this->decodeAnthropicResponse($response->status(), $response->successful(), $response->json());
    }

    public function extractDevisLignesFromImageWithFallback(string $imageBase64, string $mimeType): array
    {
        $payload = trim($imageBase64);
        if ($payload === '') {
            return ['lines' => [], 'source' => null, 'detail' => 'Image vide.'];
        }

        $attemptErrors = [];

        if ($this->isAnthropicEnabled()) {
            try {
                $anthropicLines = $this->extractDevisLignesFromImage($payload, $mimeType);
                if (!empty($anthropicLines)) {
                    return ['lines' => $anthropicLines, 'source' => 'anthropic', 'detail' => null];
                }
                $attemptErrors[] = 'Anthropic: réponse vide';
            } catch (Throwable $e) {
                // Step 1 failed -> fallback to OpenAI
                $attemptErrors[] = 'Anthropic: ' . $this->messageFromThrowable($e);
            }
        } else {
            $attemptErrors[] = 'Anthropic: clé API manquante';
        }

        if ($this->isOpenAiEnabled()) {
            try {
                $openAiLines = $this->extractDevisLignesFromOpenAiImage($payload, $mimeType);
                if (!empty($openAiLines)) {
                    return ['lines' => $openAiLines, 'source' => 'openai', 'detail' => null];
                }
                $attemptErrors[] = 'OpenAI: réponse vide';
            } catch (Throwable $e) {
                // Step 2 failed -> no image local parser available
                $attemptErrors[] = 'OpenAI: ' . $this->messageFromThrowable($e);
            }
        } else {
            $attemptErrors[] = 'OpenAI: clé API manquante';
        }

        return [
            'lines' => [],
            'source' => null,
            'detail' => implode(' | ', array_filter($attemptErrors)),
        ];
    }

    private function messageFromThrowable(mixed $throwable): string
    {
        if (!$throwable instanceof Throwable) {
            return 'erreur inconnue';
        }

        $message = trim((string) $throwable->getMessage());
        return $message !== '' ? $message : 'erreur inconnue';
    }

    public function extractDevisLignesFromOpenAiImage(string $imageBase64, string $mimeType): array
    {
        if (!$this->isOpenAiEnabled()) {
            return [];
        }

        $payload = trim($imageBase64);
        if ($payload === '') {
            return [];
        }

        $cleaned = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/i', '', $payload) ?? $payload;
        $mediaType = $this->normalizeImageMimeType($mimeType);
        if ($mediaType === null) {
            throw new RuntimeException('Format image non supporté. Utilisez JPG, PNG, WEBP ou GIF.');
        }

        $dataUrl = 'data:' . $mediaType . ';base64,' . $cleaned;

        $response = Http::timeout((int) config('services.openai.timeout', 45))
            ->withHeaders([
                'Authorization' => 'Bearer ' . (string) config('services.openai.key'),
                'content-type' => 'application/json',
            ])
            ->post('https://api.openai.com/v1/chat/completions', [
                'model' => (string) config('services.openai.model', 'gpt-4o-mini'),
                'temperature' => 0,
                'messages' => [
                    ['role' => 'system', 'content' => $this->systemPrompt()],
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text',
                                'text' => 'Analyse uniquement le tableau des produits et ignore tous les autres blocs.',
                            ],
                            [
                                'type' => 'image_url',
                                'image_url' => [
                                    'url' => $dataUrl,
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        return $this->decodeOpenAiResponse($response->status(), $response->successful(), $response->json());
    }

    private function decodeAnthropicResponse(int $status, bool $successful, mixed $jsonBody): array
    {
        $body = is_array($jsonBody) ? $jsonBody : [];

        if (!$successful) {
            $providerMessage = (string) ($body['error']['message'] ?? '');
            if ($providerMessage !== '') {
                throw new RuntimeException('Erreur IA HTTP ' . $status . ' - ' . $providerMessage);
            }
            throw new RuntimeException('Erreur IA HTTP ' . $status);
        }

        $rawOutput = $this->collectTextOutput(is_array($body) ? $body : []);
        $jsonArrayText = $this->extractJsonArray($rawOutput);

        if ($jsonArrayText === null) {
            throw new RuntimeException('Réponse IA non JSON.');
        }

        $decoded = json_decode($jsonArrayText, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('JSON IA invalide.');
        }

        return $decoded;
    }

    private function normalizeImageMimeType(string $mimeType): ?string
    {
        $value = strtolower(trim($mimeType));
        if ($value === 'image/jpg') {
            return 'image/jpeg';
        }
        if (in_array($value, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            return $value;
        }

        return null;
    }

    private function collectTextOutput(array $body): string
    {
        $content = $body['content'] ?? [];
        if (!is_array($content)) {
            return '';
        }

        $parts = [];
        foreach ($content as $block) {
            if (is_array($block) && ($block['type'] ?? null) === 'text' && isset($block['text'])) {
                $parts[] = (string) $block['text'];
            }
        }

        return trim(implode("\n", $parts));
    }

    private function extractJsonArray(string $text): ?string
    {
        $value = trim($text);
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/^```(?:json)?\s*/i', '', $value) ?? $value;
        $value = preg_replace('/\s*```$/', '', $value) ?? $value;
        $value = trim($value);

        if (str_starts_with($value, '[') && str_ends_with($value, ']')) {
            return $value;
        }

        if (preg_match('/\[[\s\S]*\]/', $value, $match)) {
            return trim((string) $match[0]);
        }

        return null;
    }

    private function decodeOpenAiResponse(int $status, bool $successful, mixed $jsonBody): array
    {
        $body = is_array($jsonBody) ? $jsonBody : [];

        if (!$successful) {
            $providerMessage = (string) ($body['error']['message'] ?? '');
            if ($providerMessage !== '') {
                throw new RuntimeException('Erreur OpenAI HTTP ' . $status . ' - ' . $providerMessage);
            }

            throw new RuntimeException('Erreur OpenAI HTTP ' . $status);
        }

        $rawOutput = $this->collectOpenAiTextOutput($body);
        if ($rawOutput === '') {
            throw new RuntimeException('Réponse OpenAI vide.');
        }

        $jsonArrayText = $this->extractJsonArray($rawOutput);
        if ($jsonArrayText === null) {
            throw new RuntimeException('Réponse OpenAI non JSON.');
        }

        $decoded = json_decode($jsonArrayText, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('JSON OpenAI invalide.');
        }

        return $decoded;
    }

    private function collectOpenAiTextOutput(array $body): string
    {
        $choices = $body['choices'] ?? [];
        if (!is_array($choices) || empty($choices[0]) || !is_array($choices[0])) {
            return '';
        }

        $message = $choices[0]['message'] ?? null;
        if (!is_array($message)) {
            return '';
        }

        $content = $message['content'] ?? '';
        if (is_string($content)) {
            return trim($content);
        }

        if (is_array($content)) {
            $parts = [];
            foreach ($content as $block) {
                if (!is_array($block)) {
                    continue;
                }
                if (($block['type'] ?? null) === 'text' && isset($block['text']) && is_string($block['text'])) {
                    $parts[] = $block['text'];
                }
            }

            return trim(implode("\n", $parts));
        }

        return '';
    }

    private function systemPrompt(): string
    {
        return <<<PROMPT
You are a data extraction agent for a devis app.
Extract all product lines from the input and return ONLY a valid JSON array.

Each object must be:
{ "designation", "quantite", "prix_unitaire_ht", "total_ht", "confiance", "remarque" }

Rules:
- Keep only real product/service lines.
- Ignore company headers/footers, legal/company metadata, contacts, addresses, dates, references, page numbers, totals, tax summaries.
- quantite defaults to 1 if missing.
- prix_unitaire_ht defaults to 0 if missing.
- total_ht = quantite * prix_unitaire_ht (2 decimals).
- confiance between 0 and 1.
- remarque in French when ambiguous, else null.
- Never invent data.
- Return JSON only, no markdown.
PROMPT;
    }
}

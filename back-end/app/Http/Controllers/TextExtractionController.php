<?php

namespace App\Http\Controllers;

use App\Models\Produit;
use App\Services\DevisAiParser;
use Illuminate\Http\Request;
use Smalot\PdfParser\Parser;
use Throwable;

class TextExtractionController extends Controller
{
    public function __construct(private readonly DevisAiParser $aiParser)
    {
    }

    public function extractDevisLignes(Request $request)
    {
        $validated = $request->validate([
            'text' => 'nullable|string',
            'pdf_base64' => 'nullable|string',
            'image_base64' => 'nullable|string',
            'mime_type' => 'nullable|string',
        ]);

        $text = trim((string) ($validated['text'] ?? ''));
        $pdfBase64 = trim((string) ($validated['pdf_base64'] ?? ''));
        $imageBase64 = trim((string) ($validated['image_base64'] ?? ''));
        $mimeType = trim((string) ($validated['mime_type'] ?? ''));

        if ($text === '' && $pdfBase64 === '' && $imageBase64 === '') {
            return response()->json([
                'message' => 'Veuillez fournir un texte, un PDF ou une image (JPG/PNG).',
            ], 422);
        }

        if ($text === '' && $imageBase64 !== '') {
            if (!$this->aiParser->isAnthropicEnabled() && !$this->aiParser->isOpenAiEnabled()) {
                try {
                    $ocrText = $this->extractTextFromImageBase64($imageBase64, $mimeType);
                    $ocrText = $this->removeRepeatedPdfHeadersAndFooters($ocrText);
                    $ocrText = $this->isolateLikelyProductZone($ocrText);
                    $regexLines = $this->extractRegexLinesFromText($ocrText, true);

                    if (!empty($regexLines)) {
                        return response()->json($this->enrichWithExistingProducts($regexLines));
                    }
                } catch (Throwable $e) {
                    return response()->json([
                        'message' => 'L’analyse des images nécessite une clé IA valide ou OCR local.',
                        'detail' => $e->getMessage(),
                    ], 422);
                }

                return response()->json([
                    'message' => 'Aucune ligne exploitable détectée dans l’image.',
                    'detail' => 'Aucune clé IA active et OCR local non concluant.',
                ], 422);
            }

            try {
                $attempt = $this->aiParser->extractDevisLignesFromImageWithFallback($imageBase64, $mimeType);
            } catch (Throwable $e) {
                return response()->json([
                    'message' => 'Image invalide ou non lisible.',
                    'detail' => $e->getMessage(),
                ], 422);
            }

            $source = $attempt['source'] ?? null;
            $rawLines = $attempt['lines'] ?? [];
            $attemptDetail = trim((string) ($attempt['detail'] ?? ''));
            if (!is_array($rawLines) || !is_string($source) || $source === '') {
                try {
                    $ocrText = $this->extractTextFromImageBase64($imageBase64, $mimeType);
                    $ocrText = $this->removeRepeatedPdfHeadersAndFooters($ocrText);
                    $ocrText = $this->isolateLikelyProductZone($ocrText);
                    $regexLines = $this->extractRegexLinesFromText($ocrText, true);

                    if (!empty($regexLines)) {
                        return response()->json($this->enrichWithExistingProducts($regexLines));
                    }
                } catch (Throwable $ocrError) {
                    $combinedDetail = $attemptDetail !== ''
                        ? $attemptDetail . ' | OCR local: ' . $ocrError->getMessage()
                        : 'OCR local: ' . $ocrError->getMessage();

                    return response()->json([
                        'message' => 'Aucune extraction IA disponible pour cette image.',
                        'detail' => $combinedDetail,
                    ], 422);
                }

                return response()->json([
                    'message' => 'Aucune extraction IA disponible pour cette image.',
                    'detail' => $attemptDetail !== ''
                        ? $attemptDetail . ' | OCR local: aucune ligne exploitable détectée.'
                        : 'OCR local: aucune ligne exploitable détectée.',
                ], 422);
            }

            $normalized = $this->normalizeAiLines($rawLines, $source);
            if (empty($normalized)) {
                try {
                    $ocrText = $this->extractTextFromImageBase64($imageBase64, $mimeType);
                    $ocrText = $this->removeRepeatedPdfHeadersAndFooters($ocrText);
                    $ocrText = $this->isolateLikelyProductZone($ocrText);
                    $regexLines = $this->extractRegexLinesFromText($ocrText, true);

                    if (!empty($regexLines)) {
                        return response()->json($this->enrichWithExistingProducts($regexLines));
                    }
                } catch (Throwable $ocrError) {
                    $combinedDetail = $attemptDetail !== ''
                        ? $attemptDetail . ' | OCR local: ' . $ocrError->getMessage()
                        : 'OCR local: ' . $ocrError->getMessage();

                    return response()->json([
                        'message' => 'Aucune ligne exploitable détectée dans l’image.',
                        'detail' => $combinedDetail,
                    ], 422);
                }

                return response()->json([
                    'message' => 'Aucune ligne exploitable détectée dans l’image.',
                    'detail' => 'Le tableau produits est peut-être absent, illisible ou filtré comme entête/pied/totaux. OCR local non concluant.',
                ], 422);
            }

            return response()->json($this->enrichWithExistingProducts($normalized));
        }

        $fromPdf = false;
        if ($text === '' && $pdfBase64 !== '') {
            try {
                $text = $this->extractTextFromPdfBase64($pdfBase64);
                $fromPdf = true;
            } catch (Throwable $e) {
                return response()->json([
                    'message' => 'Le PDF est invalide ou illisible.',
                    'detail' => $e->getMessage(),
                ], 422);
            }
        }

        if ($fromPdf) {
            $text = $this->removeRepeatedPdfHeadersAndFooters($text);
            $text = $this->isolateLikelyProductZone($text);
        }

        $aiLines = $this->tryAiExtractionWithFallback($text);
        if (!empty($aiLines)) {
            return response()->json($this->enrichWithExistingProducts($aiLines));
        }

        return response()->json($this->enrichWithExistingProducts($this->extractRegexLinesFromText($text, $fromPdf)));
    }

    private function enrichWithExistingProducts(array $lines): array
    {
        if (empty($lines)) {
            return $lines;
        }

        $products = Produit::query()->get(['id', 'libelle', 'prix_unitaire']);
        if ($products->isEmpty()) {
            return $lines;
        }

        $normalizedProducts = $products->map(function ($product) {
            $normalizedLabel = $this->normalizeCatalogLabel((string) $product->libelle);
            return [
                'id' => (int) $product->id,
                'libelle' => (string) $product->libelle,
                'libelle_lower' => $normalizedLabel,
                'prix_unitaire' => (float) $product->prix_unitaire,
            ];
        })->filter(fn ($product) => $product['libelle_lower'] !== '')->values();

        foreach ($lines as &$line) {
            if (!is_array($line)) {
                continue;
            }

            $designation = trim((string) ($line['designation'] ?? ''));
            if ($designation === '') {
                continue;
            }

            $designationLower = $this->normalizeCatalogLabel($designation);
            if ($designationLower === '') {
                continue;
            }

            $match = $normalizedProducts->first(fn ($product) => $product['libelle_lower'] === $designationLower);

            if (!$match) {
                $candidates = $normalizedProducts
                    ->filter(function ($product) use ($designationLower) {
                        return str_contains($designationLower, $product['libelle_lower'])
                            || str_contains($product['libelle_lower'], $designationLower);
                    })
                    ->sortByDesc(fn ($product) => strlen($product['libelle_lower']))
                    ->values();

                $match = $candidates->first();
            }

            if (!$match) {
                continue;
            }

            $prix = round((float) $match['prix_unitaire'], 2);
            $quantite = (float) ($line['quantite'] ?? 1);

            $line['produit_id'] = $match['id'];
            $line['prix_unitaire_ht'] = $prix;
            $line['total_ht'] = round($quantite * $prix, 2);
            $line['source'] = ($line['source'] ?? 'ai') . '+catalog';
        }

        return $lines;
    }

    private function normalizeCatalogLabel(string $value): string
    {
        $label = trim($value);
        if ($label === '') {
            return '';
        }

        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $label);
        if (is_string($ascii) && $ascii !== '') {
            $label = $ascii;
        }

        $label = mb_strtolower($label);
        $label = preg_replace('/[^a-z0-9]+/u', ' ', $label) ?? $label;
        $label = preg_replace('/\s+/u', ' ', $label) ?? $label;

        return trim($label);
    }

    private function tryAiExtractionWithFallback(string $text): array
    {
        $attempt = $this->aiParser->extractDevisLignesWithFallback($text);
        $source = $attempt['source'] ?? null;
        $rawLines = $attempt['lines'] ?? [];

        if (!is_array($rawLines) || !is_string($source) || $source === '') {
            return [];
        }

        return $this->normalizeAiLines($rawLines, $source);
    }

    private function normalizeAiLines(array $rawLines, string $source): array
    {
        $normalized = [];
        foreach ($rawLines as $line) {
            if (!is_array($line)) {
                continue;
            }

            $designation = trim((string) ($line['designation'] ?? ''));
            if (
                $designation === '' ||
                $this->isLikelyDocumentMetaLine($designation) ||
                $this->isFooterOrTotalLine($designation) ||
                $this->isTableHeaderLine($designation)
            ) {
                continue;
            }

            $quantite = (float) ($line['quantite'] ?? 1);
            $prix = (float) ($line['prix_unitaire_ht'] ?? 0);
            $confiance = (float) ($line['confiance'] ?? 0.8);
            $remarque = isset($line['remarque']) && $line['remarque'] !== '' ? (string) $line['remarque'] : null;

            $quantite = max(0, min(10000, $quantite));
            $prix = max(0, min(1000000, $prix));
            $confiance = max(0, min(1, $confiance));

            $total = round($quantite * $prix, 2);
            if ($total > 1000000000) {
                continue;
            }

            $normalized[] = [
                'designation' => $designation,
                'quantite' => $quantite,
                'prix_unitaire_ht' => round($prix, 2),
                'total_ht' => $total,
                'confiance' => round($confiance, 2),
                'remarque' => $remarque,
                'source' => $source,
            ];
        }

        return $this->deduplicateLines($normalized);
    }

    private function normalizeRegexFallbackLines(array $rawLines): array
    {
        $normalized = [];

        foreach ($rawLines as $line) {
            if (!is_array($line)) {
                continue;
            }

            $designation = trim((string) ($line['designation'] ?? ''));
            if (
                $designation === '' ||
                $this->isLikelyDocumentMetaLine($designation) ||
                $this->isFooterOrTotalLine($designation) ||
                $this->isTableHeaderLine($designation)
            ) {
                continue;
            }

            $quantite = (float) ($line['quantite'] ?? 1);
            if ($quantite <= 0) {
                $quantite = 1;
            }
            $quantite = max(1, min(10000, $quantite));

            $prix = (float) ($line['prix_unitaire_ht'] ?? 0);
            $prix = max(0, min(1000000, $prix));

            $normalized[] = [
                'designation' => $designation,
                'quantite' => $quantite,
                'prix_unitaire_ht' => round($prix, 2),
                'total_ht' => round($quantite * $prix, 2),
                'confiance' => 0.55,
                'remarque' => 'Extraction locale (fallback)',
                'source' => 'regex',
            ];
        }

        return $this->deduplicateLines($normalized);
    }

    private function deduplicateLines(array $lines): array
    {
        $seen = [];
        $unique = [];

        foreach ($lines as $line) {
            if (!is_array($line)) {
                continue;
            }

            $designation = trim((string) ($line['designation'] ?? ''));
            $quantite = round((float) ($line['quantite'] ?? 0), 4);
            $prix = round((float) ($line['prix_unitaire_ht'] ?? 0), 4);

            if ($designation === '') {
                continue;
            }

            $key = mb_strtolower($designation) . '|' . $quantite . '|' . $prix;
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $line;
        }

        return $unique;
    }

    private function hasPriceLikeNumber(string $line): bool
    {
        $value = trim($line);
        if ($value === '') {
            return false;
        }

        return (bool) preg_match('/\d[\d\s]*(?:[\.,]\d+)?(?:\s*(?:dh|dhs|mad|€|\$))?/iu', $value);
    }

    private function extractRegexLinesFromText(string $text, bool $strict): array
    {
        $lines = preg_split('/\r\n|\r|\n/', str_replace(["\t", "\v"], ' ', $text)) ?: [];
        $result = [];

        foreach ($lines as $rawLine) {
            $line = trim((string) $rawLine);
            if ($line === '') {
                continue;
            }

            if (!$this->hasPriceLikeNumber($line)) {
                continue;
            }

            if ($strict && ($this->isTableHeaderLine($line) || $this->isFooterOrTotalLine($line))) {
                continue;
            }

            $parsed = $this->parseLine($line, $strict);
            if ($parsed === null) {
                continue;
            }

            $result[] = $parsed;
        }

        return $this->normalizeRegexFallbackLines($result);
    }

    private function extractTextFromImageBase64(string $imageBase64, string $mimeType): string
    {
        $payload = trim($imageBase64);
        if ($payload === '') {
            throw new \RuntimeException('Image base64 vide.');
        }

        $normalizedMimeType = $this->normalizeIncomingImageMimeType($mimeType, $payload);
        if ($normalizedMimeType === '') {
            throw new \RuntimeException('Format image non supporté pour OCR local.');
        }

        $cleaned = preg_replace('/^data:image\/[a-zA-Z0-9.+-]+;base64,/i', '', $payload) ?? $payload;
        $binary = base64_decode($cleaned, true);

        if ($binary === false || $binary === '') {
            throw new \RuntimeException('Décodage base64 image impossible.');
        }

        $tesseractPath = trim((string) shell_exec('command -v tesseract 2>/dev/null'));
        if ($tesseractPath === '') {
            throw new \RuntimeException('OCR local indisponible: tesseract non installé sur le serveur.');
        }

        $extension = match ($normalizedMimeType) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg',
        };

        $tempPath = tempnam(sys_get_temp_dir(), 'devis-img-');
        if ($tempPath === false) {
            throw new \RuntimeException('Impossible de créer un fichier image temporaire.');
        }

        $imagePath = $tempPath . '.' . $extension;
        @rename($tempPath, $imagePath);

        try {
            file_put_contents($imagePath, $binary);

            $languages = ['fra+eng', 'eng', null];
            $text = '';

            foreach ($languages as $lang) {
                $langArg = $lang ? (' -l ' . escapeshellarg($lang)) : '';
                $command = $tesseractPath . ' ' . escapeshellarg($imagePath) . ' stdout' . $langArg . ' --psm 6 2>&1';
                $output = shell_exec($command);
                $text = trim((string) $output);

                if ($text !== '' && !preg_match('/Error opening data file|Failed loading language|Tesseract couldn\'t load any languages/i', $text)) {
                    break;
                }
            }

            if ($text === '') {
                throw new \RuntimeException('OCR local: aucun texte détecté.');
            }

            return $text;
        } finally {
            if (is_file($imagePath)) {
                @unlink($imagePath);
            }
        }
    }

    private function normalizeIncomingImageMimeType(string $mimeType, string $payload): string
    {
        $value = strtolower(trim($mimeType));
        if ($value === 'image/jpg') {
            return 'image/jpeg';
        }

        if (in_array($value, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            return $value;
        }

        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i', $payload, $match)) {
            $fromPayload = strtolower(trim((string) ($match[1] ?? '')));
            if ($fromPayload === 'image/jpg') {
                return 'image/jpeg';
            }
            if (in_array($fromPayload, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
                return $fromPayload;
            }
        }

        return '';
    }

    private function extractTextFromPdfBase64(string $pdfBase64): string
    {
        $payload = preg_replace('/^data:application\/pdf;base64,/i', '', trim($pdfBase64)) ?? '';
        $binary = base64_decode($payload, true);

        if ($binary === false || $binary === '') {
            throw new \RuntimeException('Décodage base64 impossible.');
        }

        $tempPath = tempnam(sys_get_temp_dir(), 'devis-pdf-');
        if ($tempPath === false) {
            throw new \RuntimeException('Impossible de créer un fichier temporaire.');
        }

        $pdfPath = $tempPath . '.pdf';
        @rename($tempPath, $pdfPath);

        try {
            file_put_contents($pdfPath, $binary);
            $parser = new Parser();
            $pdf = $parser->parseFile($pdfPath);
            $pages = $pdf->getPages();
            $pageTexts = [];
            foreach ($pages as $page) {
                $pageTexts[] = trim((string) $page->getText());
            }

            $text = trim(implode("\f\n", $pageTexts));

            if ($text === '') {
                throw new \RuntimeException('Aucun texte détecté dans le PDF.');
            }

            return $text;
        } finally {
            if (is_file($pdfPath)) {
                @unlink($pdfPath);
            }
        }
    }

    private function removeRepeatedPdfHeadersAndFooters(string $text): string
    {
        $pages = preg_split('/\f+/', $text) ?: [];
        if (count($pages) < 2) {
            return $text;
        }

        $candidateFrequency = [];

        foreach ($pages as $page) {
            $rawLines = preg_split('/\r\n|\r|\n/', (string) $page) ?: [];
            $lines = [];
            foreach ($rawLines as $line) {
                $trimmed = trim((string) $line);
                if ($trimmed !== '') {
                    $lines[] = $trimmed;
                }
            }

            $candidates = [];
            $maxEdge = min(3, count($lines));

            for ($index = 0; $index < $maxEdge; $index++) {
                $normalized = $this->normalizePdfNoiseCandidate($lines[$index]);
                if ($normalized !== null) {
                    $candidates[$normalized] = true;
                }
            }

            for ($index = count($lines) - $maxEdge; $index < count($lines); $index++) {
                if ($index < 0 || !isset($lines[$index])) {
                    continue;
                }
                $normalized = $this->normalizePdfNoiseCandidate($lines[$index]);
                if ($normalized !== null) {
                    $candidates[$normalized] = true;
                }
            }

            foreach (array_keys($candidates) as $candidate) {
                $candidateFrequency[$candidate] = ($candidateFrequency[$candidate] ?? 0) + 1;
            }
        }

        $pageCount = count($pages);
        $noiseCandidates = [];
        foreach ($candidateFrequency as $candidate => $count) {
            if ($count >= 2 && ($count / $pageCount) >= 0.6) {
                $noiseCandidates[$candidate] = true;
            }
        }

        if (empty($noiseCandidates)) {
            return $text;
        }

        $cleanedPages = [];
        foreach ($pages as $page) {
            $rawLines = preg_split('/\r\n|\r|\n/', (string) $page) ?: [];
            $kept = [];
            foreach ($rawLines as $line) {
                $trimmed = trim((string) $line);
                if ($trimmed === '') {
                    continue;
                }

                $normalized = $this->normalizePdfNoiseCandidate($trimmed);
                if ($normalized !== null && isset($noiseCandidates[$normalized])) {
                    continue;
                }

                $kept[] = $trimmed;
            }

            $cleanedPages[] = implode("\n", $kept);
        }

        return implode("\n", $cleanedPages);
    }

    private function normalizePdfNoiseCandidate(string $line): ?string
    {
        $value = trim($line);
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        $value = mb_strtolower($value);

        $value = preg_replace('/\b\d+\s*\/\s*\d+\b/u', ' ', $value) ?? $value;
        $value = preg_replace('/\bpage\s*\d+\b/u', ' page ', $value) ?? $value;
        $value = preg_replace('/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/u', ' ', $value) ?? $value;
        $value = preg_replace('/\b\d+[\.,]?\d*\b/u', ' ', $value) ?? $value;
        $value = preg_replace('/\s+/', ' ', $value) ?? $value;
        $value = trim($value, " \t\n\r\0\x0B-:|/");

        if ($value === '' || mb_strlen($value) < 3 || mb_strlen($value) > 80) {
            return null;
        }

        return $value;
    }

    private function parseLine(string $line, bool $strict = false): ?array
    {
        $normalized = preg_replace('/(?<=\d),(?=\d)/', '.', $line) ?? $line;

        if ($this->isLikelyDocumentMetaLine($normalized)) {
            return null;
        }

        if ($strict) {
            $hasNumber = (bool) preg_match('/\d/u', $normalized);
            $hasProductIndicator = (bool) preg_match('/\b(qt[eé]|quantit[eé]|quantity|qty|x|pcs|unit[ée]s?|pu|prix|dh|dhs)\b/iu', $normalized);
            if (!$hasNumber && !$hasProductIndicator) {
                return null;
            }
        }

        $quantity = null;
        $price = null;
        $qtyExplicit = false;
        $priceExplicit = false;

        $qtyPatterns = [
            '/\b(?:qt[eé]|quantit[eé]|quantity|qty|unit[ée]s?|pcs|pi[eè]ces?)\s*[:=]?\s*(\d+(?:\.\d+)?)/iu',
            '/\bx\s*(\d+(?:\.\d+)?)/iu',
            '/(\d+(?:\.\d+)?)\s*x\b/iu',
            '/\b(\d+(?:\.\d+)?)\s*(?:unit[ée]s?|pcs|u)\b/iu',
        ];

        foreach ($qtyPatterns as $pattern) {
            if (preg_match($pattern, $normalized, $match)) {
                $quantity = (float) $match[1];
                $qtyExplicit = true;
                break;
            }
        }

        $pricePatterns = [
            '/\b(?:pu|prix(?:\s*unitaire)?|p\.u\.?)\s*[:=]?\s*(\d+(?:\.\d+)?)/iu',
            '/(\d+(?:\.\d+)?)\s*(?:dhs?|dh)\b/iu',
            '/\b(?:dhs?|dh)\s*(\d+(?:\.\d+)?)/iu',
        ];

        foreach ($pricePatterns as $pattern) {
            if (preg_match_all($pattern, $normalized, $matches) && !empty($matches[1])) {
                $last = end($matches[1]);
                if ($last !== false) {
                    $price = (float) $last;
                    $priceExplicit = true;
                    break;
                }
            }
        }

        preg_match_all('/\d+(?:\.\d+)?/', $normalized, $numMatches, PREG_OFFSET_CAPTURE);
        $numbers = array_map(static fn(array $entry): float => (float) $entry[0], $numMatches[0] ?? []);

        if ($quantity === null && count($numbers) >= 2) {
            $quantity = (float) $numbers[0];
        }

        if ($price === null) {
            if (count($numbers) >= 2) {
                $price = (float) $numbers[count($numbers) - 1];
            } elseif (count($numbers) === 1) {
                $price = (float) $numbers[0];
            }
        }

        if ($quantity === null) {
            $quantity = 1;
        }

        $remarques = [];
        $confidence = 1.0;

        if (!$qtyExplicit && $quantity > 10000) {
            $quantity = 1;
            $confidence = min($confidence, 0.4);
            $remarques[] = 'Quantité incohérente détectée — valeur par défaut 1 appliquée';
        }

        if (!$qtyExplicit) {
            $confidence = min($confidence, 0.85);
            if (count($numbers) <= 1) {
                $remarques[] = 'Quantité manquante — valeur par défaut 1 appliquée';
            }
        }

        if ($strict && !$qtyExplicit && count($numbers) === 0) {
            return null;
        }

        if ($price === null) {
            $price = 0;
        }

        if (!$priceExplicit && $price > 1000000) {
            $price = 0;
            $confidence = min($confidence, 0.4);
            $remarques[] = 'Prix incohérent détecté — mis à 0';
        }

        if (!$priceExplicit) {
            if ($qtyExplicit && $price <= 0) {
                $confidence = min($confidence, 0.7);
                $remarques[] = 'Prix absent — conservé à 0';
            } elseif ($price <= 0) {
                $confidence = min($confidence, 0.45);
                $remarques[] = 'Prix manquant — mis à 0';
            } else {
                $confidence = min($confidence, 0.75);
                $remarques[] = 'Prix supposé — aucun indicateur de prix détecté';
            }
        }

        if ($strict && !$priceExplicit && !$qtyExplicit && $price <= 0) {
            return null;
        }

        $designation = $this->extractDesignation($line, $quantity, $price, $qtyExplicit, $priceExplicit);
        if ($designation === '') {
            return null;
        }

        if ($this->isLikelyDocumentMetaLine($designation) && !$qtyExplicit && !$priceExplicit) {
            return null;
        }

        $prixUnitaire = round((float) $price, 2);
        $quantite = (float) $quantity;

        if (($quantite * $prixUnitaire) > 1000000000) {
            return null;
        }

        return [
            'designation' => $designation,
            'quantite' => $quantite,
            'prix_unitaire_ht' => $prixUnitaire,
            'total_ht' => round($quantite * $prixUnitaire, 2),
            'confiance' => round($confidence, 2),
            'remarque' => empty($remarques) ? null : implode(' ; ', array_unique($remarques)),
        ];
    }

    private function extractDesignation(string $line, float $quantity, float $price, bool $qtyExplicit, bool $priceExplicit): string
    {
        $designation = $line;

        $patterns = [
            '/\b(?:qt[eé]|quantit[eé]|quantity|qty|unit[ée]s?|pcs|pi[eè]ces?)\s*[:=]?\s*\d+(?:[\.,]\d+)?/iu',
            '/\bx\s*\d+(?:[\.,]\d+)?/iu',
            '/\d+(?:[\.,]\d+)?\s*x\b/iu',
            '/\b(?:pu|prix(?:\s*unitaire)?|p\.u\.?)\s*[:=]?\s*\d+(?:[\.,]\d+)?\s*(?:dhs?|dh)?/iu',
            '/\d+(?:[\.,]\d+)?\s*(?:dhs?|dh)\b/iu',
            '/\b(?:dhs?|dh)\s*\d+(?:[\.,]\d+)?/iu',
        ];

        foreach ($patterns as $pattern) {
            $designation = preg_replace($pattern, ' ', $designation) ?? $designation;
        }

        if (!$qtyExplicit && !$priceExplicit) {
            $pairEnd = '/[\s,\-|\/|:]+\d+(?:[\.,]\d+)?[\s,\-|\/|:]+\d+(?:[\.,]\d+)?\s*$/u';
            if (preg_match($pairEnd, $designation)) {
                $designation = preg_replace($pairEnd, ' ', $designation) ?? $designation;
            } else {
                $singleEnd = '/[\s,\-|\/|:]+\d+(?:[\.,]\d+)?\s*$/u';
                $designation = preg_replace($singleEnd, ' ', $designation) ?? $designation;
            }
        } elseif (!$qtyExplicit) {
            $qtyToken = '/[\s,\-|\/|:]+' . preg_quote($this->formatNumberForPattern($quantity), '/') . '\s*$/u';
            $designation = preg_replace($qtyToken, ' ', $designation) ?? $designation;
        } elseif (!$priceExplicit) {
            $priceToken = '/[\s,\-|\/|:]+' . preg_quote($this->formatNumberForPattern($price), '/') . '\s*$/u';
            $designation = preg_replace($priceToken, ' ', $designation) ?? $designation;
        }

        $designation = preg_replace('/\s+/', ' ', $designation) ?? $designation;
        $designation = trim($designation, " \t\n\r\0\x0B-/,|:");

        if ($designation === '') {
            return '';
        }

        $first = mb_substr($designation, 0, 1);
        $rest = mb_substr($designation, 1);

        return mb_strtoupper($first) . $rest;
    }

    private function formatNumberForPattern(float $value): string
    {
        $formatted = rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
        return $formatted === '' ? '0' : $formatted;
    }

    private function isLikelyDocumentMetaLine(string $line): bool
    {
        $value = trim(mb_strtolower($line));
        if ($value === '') {
            return true;
        }

        $value = preg_replace('/\s+/', ' ', $value) ?? $value;

        $hasNumber = (bool) preg_match('/\d/u', $value);
        $hasIndicators = (bool) preg_match('/\b(x|qt[eé]|quantit[eé]|quantity|qty|unit[ée]s?|pcs|u|pu|prix|dh|dhs)\b/u', $value);

        if (!$hasNumber && !$hasIndicators) {
            $looksLikeCategoryLine = (bool) preg_match('/[•·]/u', $value);
            $wordCount = preg_match_all('/\p{L}+/u', $value);
            if ($looksLikeCategoryLine || $wordCount >= 3) {
                return true;
            }
        }

        $metaKeywordCount = preg_match_all('/\b(sarl|s\.a\.r\.l|sarlau|societe|adresse|tel|t[eé]l[eé]phone|email|e-mail|ice|if|rc|patente|devis|facture|bon de commande|client|fournisseur|page|www|http|fax|tva|total|ttc|ht|date|validit[eé]|capital)\b/iu', $value);

        if ($this->containsClientInfoKeywords($value) && !$hasIndicators) {
            return true;
        }

        if ($metaKeywordCount >= 2 && !$hasIndicators) {
            return true;
        }

        if (preg_match('/\b(ice|if|rc|patente)\b/u', $value) && preg_match('/\d{6,}/u', $value)) {
            return true;
        }

        return false;
    }

    private function isolateLikelyProductZone(string $text): string
    {
        $rawLines = preg_split('/\r\n|\r|\n/', $text) ?: [];
        $lines = [];
        foreach ($rawLines as $line) {
            $trimmed = trim((string) $line);
            if ($trimmed !== '') {
                $lines[] = $trimmed;
            }
        }

        if (count($lines) < 5) {
            return $text;
        }

        $segments = [];
        $segmentStart = null;

        for ($i = 0; $i < count($lines); $i++) {
            $line = $lines[$i];

            if ($this->isFooterOrTotalLine($line) || $this->isLikelyDocumentMetaLine($line)) {
                if ($segmentStart !== null) {
                    $segments[] = [$segmentStart, $i - 1];
                    $segmentStart = null;
                }
                continue;
            }

            $tableSignal = $this->isTableHeaderLine($line) || $this->isLikelyProductDataLine($line);
            if ($tableSignal && $segmentStart === null) {
                $segmentStart = $i;
                continue;
            }

            if (!$tableSignal && $segmentStart !== null) {
                $next = $lines[$i + 1] ?? '';
                $nextLooksLikeRow = $next !== '' && ($this->isLikelyProductDataLine($next) || $this->isTableHeaderLine($next));
                if (!$nextLooksLikeRow) {
                    $segments[] = [$segmentStart, $i - 1];
                    $segmentStart = null;
                }
            }
        }

        if ($segmentStart !== null) {
            $segments[] = [$segmentStart, count($lines) - 1];
        }

        if (empty($segments)) {
            return $text;
        }

        $bestScore = -1;
        $bestRange = null;
        foreach ($segments as [$start, $end]) {
            $score = 0;
            $rowCount = 0;
            for ($i = $start; $i <= $end; $i++) {
                if ($this->isLikelyProductDataLine($lines[$i])) {
                    $score += 2;
                    $rowCount++;
                } elseif ($this->isTableHeaderLine($lines[$i])) {
                    $score += 1;
                }
            }

            if ($rowCount >= 2) {
                $score += 4;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestRange = [$start, $end];
            }
        }

        if ($bestRange === null) {
            return $text;
        }

        [$start, $end] = $bestRange;
        $subset = array_slice($lines, $start, ($end - $start) + 1);
        $subset = array_values(array_filter($subset, function (string $line): bool {
            if ($this->isFooterOrTotalLine($line)) {
                return false;
            }
            if ($this->isTableHeaderLine($line)) {
                return false;
            }
            return $this->isLikelyProductDataLine($line) || $this->parseLine($line, false) !== null;
        }));

        if (count($subset) < 1) {
            return $text;
        }

        return implode("\n", $subset);
    }

    private function isLikelyProductDataLine(string $line): bool
    {
        $value = trim(mb_strtolower($line));
        if ($value === '') {
            return false;
        }

        if ($this->isFooterOrTotalLine($value) || $this->isTableHeaderLine($value)) {
            return false;
        }

        if ($this->containsClientInfoKeywords($value)) {
            return false;
        }

        $hasText = (bool) preg_match('/\p{L}{2,}/u', $value);
        $numberHits = preg_match_all('/\d+(?:[\.,]\d+)?/u', $value);
        $hasPriceCue = (bool) preg_match('/\b(dh|dhs|pu|prix|ht|ttc)\b/u', $value);
        $hasQtyCue = (bool) preg_match('/\b(qt[eé]|qte|quantit[eé]|quantity|qty|pcs|x)\b/u', $value);

        if ($hasText && $numberHits >= 2) {
            return true;
        }

        if ($hasText && $numberHits >= 1 && ($hasPriceCue || $hasQtyCue)) {
            return true;
        }

        if ($hasText && $numberHits >= 1 && preg_match('/\d+(?:[\.,]\d+)?\s*$/u', $value)) {
            return true;
        }

        return false;
    }

    private function containsClientInfoKeywords(string $value): bool
    {
        return (bool) preg_match(
            '/\b(client|fournisseur|devis\s*n|devis\s*no|date|validit[eé]|valide\s*j?u?s?q?u?\'?au|t[eé]l|t[eé]l[eé]phone|fax|email|e-mail|adresse|ice|if|rc|patente|cnss|capital|sarl|sarlau|societe)\b/iu',
            $value
        );
    }

    private function isTableHeaderLine(string $line): bool
    {
        $value = trim(mb_strtolower($line));
        if ($value === '') {
            return true;
        }

        $value = preg_replace('/\s+/', ' ', $value) ?? $value;

        if (preg_match('/\b(page|devis|client|fournisseur|adresse|ice|if|rc|patente)\b/u', $value)) {
            return true;
        }

        $headerHits = preg_match_all('/\b(d[eé]signation|description|produit|article|quantit[eé]|qt[eé]|qty|qte|pu|prix|unitaire|montant|total|ht|ttc|remise)\b/u', $value);
        $hasNumber = (bool) preg_match('/\d/u', $value);

        if ($headerHits >= 2 && !$hasNumber) {
            return true;
        }

        if ($headerHits >= 1 && preg_match('/^[\p{L}\s\-\/:|]+$/u', $value)) {
            return true;
        }

        return false;
    }

    private function isFooterOrTotalLine(string $line): bool
    {
        $value = trim(mb_strtolower($line));
        if ($value === '') {
            return true;
        }

        $value = preg_replace('/\s+/', ' ', $value) ?? $value;

        return (bool) preg_match(
            '/\b(tva|total|sous\s*total|total\s*ht|total\s*ttc|net\s*[àa]?\s*payer|montant\s*ttc|arr[eê]t[eé]|signature|cachet|conditions|r[eè]glement|validit[eé]|merci|page\s*\d+)\b/u',
            $value
        );
    }
}

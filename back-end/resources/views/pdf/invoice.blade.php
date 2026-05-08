<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {
    margin-top: 20px;
    margin-bottom: 0px; /* Zero margin bottom to simplify bounds */
    margin-left: 0px;
    margin-right: 0px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    font-family: DejaVu Sans, sans-serif;
    color: #1f2f6f;
    font-size: 12px;
}

#footer {
    position: fixed; 
    bottom: 0px; /* Force lock physically to the bottom-most pixel of the paper */
    left: 0px; 
    right: 0px;
    height: 105px;
    background-color: #1f2f6f;
}

.footer-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
}

.footer-table td {
    color: white;
    text-align: center;
    font-size: 10px;
    line-height: 1.6;
    vertical-align: middle;
    padding: 0;
}

.footer-line {
    display: block;
    width: 100%;
    text-align: center;
}

.footer-content {
    width: 86%;
    margin: 0 auto;
    text-align: center;
     position: relative;
  left: 102px;
}

.content-wrapper {
    width: 86%;
    margin: 0 auto;
}

/* ══ HEADER ══ */
.header-table {
    width: 100%;
    border-bottom: 2.5px solid #1f2f6f;
    padding-bottom: 8px;
    margin-bottom: 15px;
}
.header-table td {
    vertical-align: middle;
}
.logo-td {
    width: 80px;
}
.logo {
    width: 120px;
    height: 110px;
    object-fit: contain;
}
.company-td {
    text-align: center;
}
.company {
    font-size: 28px;
    font-weight: bold;
    font-family: "Times New Roman", serif;
    letter-spacing: 2px;
    line-height: 1.1;
}
.slogan {
    font-size: 11px;
    color: #3a4a9f;
    margin-top: 4px;
}

/* ══ META ══ */
.meta-table {
    width: 100%;
    margin-bottom: 12px;
}
.meta-table td {
    vertical-align: middle;
}
.client-td {
    width: 45%;
}
.client-box {
    border: 2px solid #1f2f6f;
    border-radius: 80px;
    padding: 8px 20px;
    font-size: 18px;
    font-weight: bold;
    text-align: left;
    display: inline-block;
}
.info-td {
    width: 55%;
    text-align: right;
}
.info-box {
    display: inline-block;
    width: 320px;
    border: 2px solid #1f2f6f;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 11.5px;
    line-height: 1.6;
    text-align: left;
}
.info-box b { font-weight: bold; }

/* ══ ITEMS TABLE ══ */
.items-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 2px solid #1f2f6f;
    margin-bottom: 15px;
}

.items-table thead tr { background-color: #1f2f6f; }

.items-table th {
    color: white;
    padding: 6px 7px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
}

.items-table td {
    padding: 2px 7px;
    font-size: 14.5px;
    font-weight: 400;
    line-height: 1.4;
    border-bottom: 1px solid #d0d6ee;
    vertical-align: middle;
    height: 28px;
}

.items-table tbody tr:nth-child(even) td { background-color: #f2f4fb; }
.items-table tbody tr:last-child td { border-bottom: none; }

.col-qte { width: 11%; text-align: center; }
.col-des { width: 51%; }
.col-pu  { width: 18%; text-align: right; }
.col-mt  { width: 20%; text-align: right; font-weight: bold; }

/* ══ TOTALS ══ */
.totals-table {
    width: 240px;
    border: 2px solid #1f2f6f;
    border-radius: 4px;
    border-collapse: collapse;
    float: right;
}

.totals-table td {
    padding: 7px 12px;
    font-size: 12.5px;
    border-bottom: 1px solid #d0d6ee;
}

.t-label-cell {
    background-color: #1f2f6f;
    color: white;
    width: 105px;
}

.t-value-cell {
    background-color: #fff;
    font-weight: bold;
    text-align: right;
    width: 135px;
}

.totals-table tr.ttc .t-label-cell {
    background-color: #0f1d52;
    font-size: 13px;
    font-weight: bold;
    border-bottom: none;
}
.totals-table tr.ttc .t-value-cell {
    background-color: #e8ebf7;
    font-size: 13px;
    color: #0f1d52;
    border-bottom: none;
}

.invoice-page {
    page-break-after: always;
}

.invoice-page:last-child {
    page-break-after: auto;
}
</style>
</head>
<body>



@php
    $lignesPages = $devis->lignes->chunk(12);
    $totalPages = $lignesPages->count();
    $hasMultiplePages = $totalPages > 1;
    $totalHT = $devis->lignes->sum(fn($l) => $l->quantite * $l->prix_unitaire);

    // Resolve company based on authenticated account (multi-company support).
    $company = auth()->user()->company ?? $devis->user->company ?? null;

    // Friendly company field resolution with common fallbacks.
    $companyName = $company->name ?? $company->nom ?? $company->company_name ?? 'Votre Société';
    $companySlogan = $company->slogan ?? $company->tagline ?? '';

    // Logo: prefer company-provided path, support URLs, storage/app/public, public/storage, and fallback to public/logo.jpg.
    $logoData = null;
    $logoSrc = null;
    $logoPath = $company->logo_path ?? $company->logo ?? null;

    if (!empty($logoPath)) {
        // If it's an external URL, use it directly (may not embed when generating PDF remotely).
        if (preg_match('/^https?:\/\//i', $logoPath)) {
            $logoSrc = $logoPath;
        } else {
            $possible = [
                public_path($logoPath),
                public_path('storage/' . ltrim($logoPath, '/')),
                storage_path('app/public/' . ltrim($logoPath, '/')),
                storage_path('app/' . ltrim($logoPath, '/')),
            ];
            foreach ($possible as $p) {
                if (file_exists($p) && is_readable($p)) {
                    $mime = function_exists('mime_content_type') ? mime_content_type($p) : 'image/jpeg';
                    $logoData = base64_encode(file_get_contents($p));
                    $logoSrc = "data:{$mime};base64,{$logoData}";
                    break;
                }
            }
        }
    }

    // Fallback to public/logo.jpg if no logo resolved
    if (empty($logoSrc) && file_exists(public_path('logo.jpg'))) {
        $p = public_path('logo.jpg');
        $mime = function_exists('mime_content_type') ? mime_content_type($p) : 'image/jpeg';
        $logoData = base64_encode(file_get_contents($p));
        $logoSrc = "data:{$mime};base64,{$logoData}";
    }

    // Contact & registration details fallbacks
    $companyAddress = $company->address ?? $company->adresse ?? $company->street ?? '';
    $companyPhone = $company->phone ?? $company->telephone ?? $company->tel ?? '';
    $companyFax = $company->fax ?? '';
    $companyEmail = $company->email ?? $company->mail ?? '';
    $companyIF = $company->if ?? $company->if_number ?? '';
    $companyPatente = $company->patente ?? '';
    $companyRC = $company->rc ?? '';
    $companyCNSS = $company->cnss ?? '';
    $companyICE = $company->ice ?? '';

    // Resolve TVA percent: accept explicit numeric tva_percent, or infer from tva_type string.
    $tvaPercent = 20; // default
    if ($company) {
        if (isset($company->tva_percent) && is_numeric($company->tva_percent)) {
            $tvaPercent = (float) $company->tva_percent;
        } elseif (!empty($company->tva_type)) {
            $raw = strtolower(trim($company->tva_type));
            if (str_contains($raw, 'no') || str_contains($raw, 'none')) {
                $tvaPercent = 0;
            } elseif (preg_match('/(\d+(?:\.\d+)?)/', $raw, $m)) {
                $tvaPercent = (float) $m[1];
            }
        }
    }

    $tva = $totalHT * ($tvaPercent / 100);
    $ttc = $totalHT + $tva;
@endphp

<div class="content-wrapper">
    @foreach($lignesPages as $pageIndex => $lignesPage)
    @php
        $isFirstPage = $pageIndex === 0;
        $isLastPage = $pageIndex === $totalPages - 1;
    @endphp
    <div class="invoice-page">
        
        @if($isFirstPage)
            <table class="header-table">
                <tr>
                    <td class="logo-td">
                        @if(!empty($logoSrc))
                            <img class="logo" src="{{ $logoSrc }}" alt="Logo">
                        @else
                            <div style="width:120px;height:110px;display:flex;align-items:center;justify-content:center;font-weight:bold">{{ \Illuminate\Support\Str::limit($companyName, 12) }}</div>
                        @endif
                    </td>
                    <td class="company-td">
                        <div class="company">{{ $companyName }}</div>
                        @if(!empty($companySlogan))
                        <div class="slogan">{{ $companySlogan }}</div>
                        @endif
                    </td>
                </tr>
            </table>

            <table class="meta-table">
                <tr>
                    <td class="client-td">
                        <div class="client-box">Devis N°&nbsp;: {{ $devis->id }}</div>
                    </td>
                    <td class="info-td">
                        <div class="info-box">
                                <b>{{ $devis->client->nom }}</b><br>
                                <b>Date&nbsp;:</b> {{ $devis->date_emission }}<br>
                                <b>Valide jusqu'au&nbsp;:</b> {{ $devis->date_validite ?? '-' }}<br>
                                <b>Tél&nbsp;:</b> {{ $devis->client->telephone ?? '-' }}
                        </div>
                    </td>
                </tr>
            </table>
        @else
            <!-- Spacer for continuation pages to give breathing room -->
            <div style="height: 40px;"></div>
        @endif

        <table class="items-table">
                <thead>
                        <tr>
                                <th class="col-qte">Qté</th>
                                <th class="col-des">Désignation</th>
                                <th class="col-pu">P.U. H.T.</th>
                                <th class="col-mt">Montant H.T.</th>
                        </tr>
                </thead>
                <tbody>
                        @foreach($lignesPage as $ligne)
                        <tr>
                                <td class="col-qte">{{ $ligne->quantite }}</td>
                                <td class="col-des">{{ $ligne->produit?->libelle ?: $ligne->description }}</td>
                                <td class="col-pu">{{ number_format($ligne->prix_unitaire, 2, ',', ' ') }}</td>
                                <td class="col-mt">{{ number_format($ligne->quantite * $ligne->prix_unitaire, 2, ',', ' ') }}</td>
                        </tr>
                        @endforeach

                        @php $empty = max(0, 12 - $lignesPage->count()); @endphp
                        @for($i = 0; $i < $empty; $i++)
                        <tr><td class="col-qte">&nbsp;</td><td class="col-des"></td><td class="col-pu"></td><td class="col-mt"></td></tr>
                        @endfor
                </tbody>
        </table>

        @if($isLastPage)
            <table class="totals-table">
                <tr>
                    <td class="t-label-cell">TOTAL H.T.</td>
                    <td class="t-value-cell">{{ number_format($totalHT, 2, ',', ' ') }}</td>
                </tr>
                <tr>
                    <td class="t-label-cell">T.V.A. ({{ rtrim(rtrim(number_format($tvaPercent, 2, '.', ''), '0'), '.') }} %)</td>
                    <td class="t-value-cell">{{ number_format($tva, 2, ',', ' ') }}</td>
                </tr>
                <tr class="ttc">
                    <td class="t-label-cell">TOTAL T.T.C.</td>
                    <td class="t-value-cell">{{ number_format($ttc, 2, ',', ' ') }}</td>
                </tr>
            </table>
            <div id="footer">
    <table class="footer-table">
        <tr>
            <td>
                <div class="footer-content">
                    @if(!empty($companyAddress))
                        <span class="footer-line">{{ $companyAddress }}</span>
                    @endif

                    @if(!empty($companyPhone) || !empty($companyFax))
                        <span class="footer-line">
                            @if(!empty($companyPhone)) Tél : {{ $companyPhone }} @endif
                            @if(!empty($companyPhone) && !empty($companyFax)) | @endif
                            @if(!empty($companyFax)) Fax : {{ $companyFax }} @endif
                        </span>
                    @endif

                    @if(!empty($companyIF) || !empty($companyPatente) || !empty($companyRC))
                        <span class="footer-line">I.F. : {{ $companyIF ?: '-' }} · Patente : {{ $companyPatente ?: '-' }} · R.C. : {{ $companyRC ?: '-' }}</span>
                    @endif

                    @if(!empty($companyCNSS) || !empty($companyICE))
                        <span class="footer-line">
                            @if(!empty($companyCNSS)) C.N.S.S. : {{ $companyCNSS }} @endif
                            @if(!empty($companyCNSS) && !empty($companyICE)) · @endif
                            @if(!empty($companyICE)) ICE : {{ $companyICE }} @endif
                        </span>
                    @endif

                    @if(!empty($companyEmail))
                        <span class="footer-line">E-mail : {{ $companyEmail }}</span>
                    @endif
                </div>
            </td>
        </tr>
    </table>
</div>
        @elseif(!$hasMultiplePages)
            <table class="totals-table">
                <tr>
                    <td class="t-label-cell">TOTAL H.T.</td>
                    <td class="t-value-cell">{{ number_format($totalHT, 2, ',', ' ') }}</td>
                </tr>
                <tr>
                    <td class="t-label-cell">T.V.A. ({{ rtrim(rtrim(number_format($tvaPercent, 2, '.', ''), '0'), '.') }} %)</td>
                    <td class="t-value-cell">{{ number_format($tva, 2, ',', ' ') }}</td>
                </tr>
                <tr class="ttc">
                    <td class="t-label-cell">TOTAL T.T.C.</td>
                    <td class="t-value-cell">{{ number_format($ttc, 2, ',', ' ') }}</td>
                </tr>
            </table>
        @endif

    </div>
    @endforeach
</div>

</body>
</html>
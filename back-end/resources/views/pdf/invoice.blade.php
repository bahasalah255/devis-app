<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #ffffff;
            color: #1a2e6e;
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 11px;
        }

        .page {
            width: 210mm;
            min-height: 297mm;
            position: relative;
            padding: 6mm 8mm 28mm 8mm;
        }

        /* ── HEADER ── */
        .header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 4px;
            border-bottom: 2px solid #1a2e6e;
        }

        .logo {
            flex-shrink: 0;
            width: 60px;
            height: 60px;
        }

        .logo svg {
            width: 60px;
            height: 60px;
        }

        .header-text {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .company-name {
            font-size: 22px;
            font-weight: 900;
            font-style: italic;
            color: #1a2e6e;
            font-family: 'Times New Roman', DejaVu Serif, serif;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            line-height: 1.1;
        }

        .slogan {
            font-size: 9px;
            font-weight: 600;
            color: #1a2e6e;
            margin-top: 3px;
        }

        /* ── META ROW ── */
        .meta-row {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 8mm;
            margin-bottom: 7mm;
            gap: 10px;
        }

        .box-client {
            width: 44%;
            min-height: 32px;
            border: 2px solid #1a2e6e;
            border-radius: 30px;
            padding: 7px 18px;
            display: flex;
            align-items: center;
            background: #ffffff;
            font-size: 12px;
            font-weight: 700;
            color: #1a2e6e;
        }

        .box-info {
            width: 44%;
            min-height: 80px;
            border: 2.5px solid #1a2e6e;
            border-radius: 8px;
            padding: 8px 14px;
            background: #ffffff;
            font-size: 10.5px;
            color: #1a2e6e;
            line-height: 1.6;
        }

        .box-info strong {
            font-weight: 800;
        }

        /* ── TABLE ── */
        .items {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 1.5px solid #1a2e6e;
        }

        .items thead th {
            background: #2d4aab;
            color: #fff;
            font-size: 10px;
            font-weight: 800;
            padding: 6px 4px;
            text-align: center;
            border-right: 1px solid #7b89bf;
        }

        .items thead th:last-child { border-right: 0; }

        .items tbody td {
            height: 22px;
            padding: 2px 4px;
            font-size: 10px;
            border-right: 1px solid #9faad7;
            border-bottom: 1px solid #9faad7;
            vertical-align: middle;
            background: #dde1f5;
        }

        .items tbody td:last-child { border-right: 0; }
        .items tbody tr:last-child td { border-bottom: 0; }

        .col-code        { width: 14%; text-align: center; }
        .col-designation { width: 40%; text-align: left; padding-left: 6px; }
        .col-qte         { width: 10%; text-align: center; }
        .col-pu          { width: 16%; text-align: right; padding-right: 5px; }
        .col-montant     { width: 20%; text-align: right; padding-right: 5px; }

        /* ── TOTALS ── */
        .totals-wrapper {
            display: flex;
            justify-content: flex-end;
            margin-top: 0;
            width: 100%;
        }

        .totals {
            width: 36%;
            border-collapse: collapse;
            border: 1.5px solid #1a2e6e;
        }

        .tot-label {
            background: #2d4aab;
            color: #fff;
            font-weight: 800;
            font-size: 9.5px;
            padding: 5px 10px;
            border-bottom: 1px solid #7b89bf;
            white-space: nowrap;
            width: 60%;
        }

        .tot-value {
            border-left: 1.5px solid #9faad7;
            border-bottom: 1px solid #9faad7;
            background: #fff;
            text-align: right;
            font-size: 10px;
            font-weight: 700;
            padding: 5px 8px;
            width: 40%;
        }

        .totals tr:last-child .tot-label,
        .totals tr:last-child .tot-value {
            border-bottom: 0;
        }

        /* ── FOOTER ── */
        .footer {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            background: #1a2e6e;
            color: #fff;
            text-align: center;
            padding: 9px 10px;
            line-height: 1.55;
            font-size: 9px;
            font-weight: 500;
        }
    </style>
</head>
<body>
<div class="page">

    <!-- HEADER -->
    <div class="header">
        <div class="logo">
            <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer hexagon -->
                <polygon
                    points="40,5 72,22 72,58 40,75 8,58 8,22"
                    fill="none"
                    stroke="#1a2e6e"
                    stroke-width="4"
                />
                <!-- Inner hexagon -->
                <polygon
                    points="40,14 63,27 63,53 40,66 17,53 17,27"
                    fill="none"
                    stroke="#1a2e6e"
                    stroke-width="2"
                />
                <!-- E -->
                <text x="14" y="47" font-family="Arial" font-weight="900"
                      font-size="22" fill="#1a2e6e">E</text>
                <!-- dot -->
                <circle cx="40" cy="40" r="3" fill="#1a2e6e"/>
                <!-- C -->
                <text x="44" y="47" font-family="Arial" font-weight="900"
                      font-size="22" fill="#1a2e6e">C</text>
            </svg>
        </div>

        <div class="header-text">
            <div class="company-name">EQUIPEMENT CHEFCHAOUNI SARL</div>
            <div class="slogan">
                Outillages à main - Electricité - Sanitaire - Quincaillerie - Outillages électroportatifs - Peintures
            </div>
        </div>
    </div>

    <!-- META ROW: client left, info right -->
    <div class="meta-row">
        <div class="box-client">
            {{ $devis->client->nom }}
        </div>

        <div class="box-info">
            <strong>N° :</strong> {{ $devis->id }}<br>
            <strong>Date :</strong> {{ $devis->date_emission }}<br>
            @if($devis->date_validite)
                <strong>Valide jusqu'au :</strong> {{ $devis->date_validite }}<br>
            @endif
            @if($devis->client->telephone)
                <strong>Tél :</strong> {{ $devis->client->telephone }}<br>
            @endif
            @if($devis->client->email)
                <strong>Email :</strong> {{ $devis->client->email }}
            @endif
        </div>
    </div>

    <!-- ITEMS TABLE -->
    <table class="items">
        <thead>
            <tr>
                <th class="col-code">Code Article</th>
                <th class="col-designation">Désignation</th>
                <th class="col-qte">Qté</th>
                <th class="col-pu">P.U.H.T</th>
                <th class="col-montant">Montant H.T.</th>
            </tr>
        </thead>
        <tbody>
            @foreach($devis->lignes as $ligne)
            <tr>
                <td class="col-code">{{ $ligne->code_article ?? '' }}</td>
                <td class="col-designation">{{ $ligne->description }}</td>
                <td class="col-qte">{{ $ligne->quantite }}</td>
                <td class="col-pu">{{ number_format($ligne->prix_unitaire, 2) }}</td>
                <td class="col-montant">{{ number_format($ligne->quantite * $ligne->prix_unitaire * (1 - ($ligne->remise ?? 0) / 100), 2) }}</td>
            </tr>
            @endforeach

            @for($i = 0; $i < max(0, 16 - $devis->lignes->count()); $i++)
            <tr>
                <td class="col-code"></td>
                <td class="col-designation"></td>
                <td class="col-qte"></td>
                <td class="col-pu"></td>
                <td class="col-montant"></td>
            </tr>
            @endfor
        </tbody>
    </table>

    <!-- TOTALS -->
    @php
        $totalHT  = $devis->lignes->sum(fn($l) => $l->quantite * $l->prix_unitaire * (1 - ($l->remise ?? 0) / 100));
        $tva      = $totalHT * 0.20;
        $totalTTC = $totalHT + $tva;
    @endphp

    <div class="totals-wrapper">
        <table class="totals">
            <tr>
                <td class="tot-label">TOTAL H.T.</td>
                <td class="tot-value">{{ number_format($totalHT, 2) }}</td>
            </tr>
            <tr>
                <td class="tot-label">TOTAL T.V.A. 20%</td>
                <td class="tot-value">{{ number_format($tva, 2) }}</td>
            </tr>
            <tr>
                <td class="tot-label">TOTAL T.T.C.</td>
                <td class="tot-value">{{ number_format($totalTTC, 2) }}</td>
            </tr>
        </table>
    </div>

    <!-- FOOTER -->
    <div class="footer">
        54, Bd Chefchaouni Aïn Sebaâ - CASABLANCA &nbsp; Tél.: 022.35.33.82 / 022.66.17.87 - Fax: 022.66.17.87<br>
        I.F.: 1682364 - Patente: 31590255 - R.C.: 185015 - C.N.S.S.: 7842702 - ICE: 000013024000074<br>
        E-Mail: eqchefchaouni@gmail.com
    </div>

</div>
</body>
</html>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>

@page {
    margin: 0;
    padding: 0;
    size: 210mm 297mm;
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

body {
    height: auto;
    overflow: visible;
}

/*
 * Outer page table: exactly 1122px tall (= 297mm at 96dpi)
 * Row 1: .main-row  → height:100% → stretches to fill remaining space
 * Row 2: .footer-row → fixed 76px  (= ~20mm)
 * The items-table inside .main-cell also uses height:100% so its
 * tbody fills whatever vertical space is left.
 */
.page-table {
    width: 100%;
    height: 1122px;
    border-collapse: collapse;
    table-layout: fixed;
}

.main-row { height: 100%; vertical-align: top; }

.main-cell {
    /* top/sides padding, NO bottom padding — items table fills rest */
    padding: 26px 38px 0 38px;
    vertical-align: top;
    height: 100%;
}

.footer-row { height: 76px; }

.footer-cell {
    height: 76px;
    background: #1f2f6f;
    color: white;
    text-align: center;
    font-size: 10px;
    line-height: 1.9;
    padding: 10px 20px;
    vertical-align: middle;
}

/* ══ INNER LAYOUT TABLE
   Forces header + meta + items + totals to fill .main-cell height ══ */
.inner-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
}

/* Fixed-height rows */
.row-header  { height: 90px;  vertical-align: top; }
.row-meta    { height: 40px;  vertical-align: middle; }
.row-totals  { height: 100px; vertical-align: top; }

/* This row gets all leftover space */
.row-items   { height: 50%; vertical-align: top; }

.cell-header, .cell-meta, .cell-items, .cell-totals {
    padding: 0;
    vertical-align: top;
}

.cell-meta   { vertical-align: middle; }
.cell-totals { vertical-align: top; padding-top: 14px; }

/* ══ HEADER ══ */
.header {
    display: -webkit-flex;
    display: flex;
    -webkit-align-items: center;
    align-items: center;
    border-bottom: 2.5px solid #1f2f6f;
    padding-bottom: 10px;
    margin-bottom: 0;
    height: 90px;
}

.logo {
    width: 68px;
    height: 68px;
    object-fit: contain;
    margin-right: 14px;
    border: 1px solid #d0d6ee;
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
}

.company {
    display : flex;
    justify-content : center;
    font-size: 30px;
    font-weight: bold;
    font-family: "Times New Roman", serif;
    letter-spacing: 2px;
    line-height: 1.2;
}

.slogan {
    font-size: 12px;
    color: #3a4a9f;
    margin-top: 5px;
}

/* ══ META ══ */
.meta {
    display: -webkit-flex;
    display: flex;
    -webkit-align-items: center;
    align-items: center;
    height: 82px;
}

.client-box {
    -webkit-flex: 0 0 200px;
    flex: 0 0 200px;
    border: 2px solid #1f2f6f;
    border-radius: 80px;
    padding: 10px 22px;
    font-size: 20px;
    font-weight: bold;
    display: -webkit-flex;
    display: flex;
    -webkit-align-items: center;
    align-items: center;
    height: 46px;
}

.info-box {
    -webkit-flex-shrink: 0;
    flex-shrink: 0;
    width: 320px;
    border: 2px solid #1f2f6f;
    border-radius: 6px;
    padding: 15px 14px;
    font-size: 11.5px;
    line-height: 1.75;
    margin-left: 350px;
}
.info-box b { font-weight: bold; }

/* ══ ITEMS TABLE — fills 100% of .row-items height ══ */
.items-table {
    width: 100%;
    height: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 2px solid #1f2f6f;
}

.items-table thead tr { background: #1f2f6f; }

.items-table th {
    color: white;
    padding: 8px 7px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
}

.items-table td {
    /* no fixed height — rows auto-distribute the available height equally */
    padding: 0 7px;
    font-size: 18px;
    font-weight: 400;
    line-height: 1.4;
    border-bottom: 1px solid #d0d6ee;
    vertical-align: middle;
}

.items-table tbody tr:nth-child(even) td { background: #f2f4fb; }
.items-table tbody tr:last-child td { border-bottom: none; }

.col-qte { width: 11%; text-align: center; }
.col-des { width: 51%; }
.col-pu  { width: 18%; text-align: right; }
.col-mt  { width: 20%; text-align: right; font-weight: bold; }

/* ══ TOTALS ══ */
.totals-wrap {
    display: -webkit-flex;
    display: flex;
    -webkit-justify-content: flex-end;
    justify-content: flex-end;
}

.totals {
    width: 230px;
    border: 2px solid #1f2f6f;
    border-radius: 4px;
    overflow: hidden;
}

.t-row {
    display: -webkit-flex;
    display: flex;
    border-bottom: 1px solid #d0d6ee;
}
.t-row:last-child { border-bottom: none; }

.t-label {
    -webkit-flex: 1;
    flex: 1;
    background: #1f2f6f;
    color: white;
    padding: 8px 12px;
    font-size: 12px;
    display: -webkit-flex;
    display: flex;
    -webkit-align-items: center;
    align-items: center;
}

.t-value {
    width: 96px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: bold;
    background: #fff;
    display: -webkit-flex;
    display: flex;
    -webkit-align-items: center;
    align-items: center;
    -webkit-justify-content: flex-end;
    justify-content: flex-end;
}

.t-row.ttc .t-label {
    background: #0f1d52;
    font-size: 13px;
    font-weight: bold;
}
.t-row.ttc .t-value {
    background: #e8ebf7;
    font-size: 13px;
    color: #0f1d52;
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
    $tva = $totalHT * 0.2;
    $ttc = $totalHT + $tva;
@endphp

@foreach($lignesPages as $pageIndex => $lignesPage)
@php
        $isFirstPage = $pageIndex === 0;
        $isLastPage = $pageIndex === $totalPages - 1;
        $showFooter = !$hasMultiplePages || $isLastPage;
@endphp
<div class="invoice-page">
  {{-- OUTER TABLE: 2 rows — main content + footer ══ --}}
  <table class="page-table">
  <tbody>

  <tr class="main-row">
    <td class="main-cell">
            @if($isFirstPage)
                {{-- FIRST PAGE: full layout ══ --}}
                <table class="inner-table">
                <tbody>
                    <tr class="row-header">
                        <td class="cell-header">
                            <div class="header">
                                    <img class="logo" src="{{ public_path('logo.png') }}" alt="Logo">
                                    <div>
                                            <div class="company">EQUIPEMENT CHEFCHAOUNI SARL</div>
                                            <div class="slogan">
                                                    Outillages à main &nbsp;·&nbsp; Électricité &nbsp;·&nbsp; Sanitaire &nbsp;·&nbsp;
                                                    Quincaillerie &nbsp;·&nbsp; Outillages électroportatifs &nbsp;·&nbsp; Peintures
                                            </div>
                                    </div>
                            </div>
                        </td>
                    </tr>

                    <tr class="row-meta">
                        <td class="cell-meta">
                            <div class="meta">
                                    <div class="client-box">Devis N°&nbsp;:{{ $devis->id }}</div>
                                    <div class="info-box">
                                            <b>{{ $devis->client->nom }}<br>
                                            <b>Date&nbsp;:</b> {{ $devis->date_emission }}<br>
                                            <b>Valide jusqu'au&nbsp;:</b> {{ $devis->date_validite ?? '-' }}<br>
                                            <b>Tél&nbsp;:</b> {{ $devis->client->telephone ?? '-' }}
                                    </div>
                            </div>
                        </td>
                    </tr>

                    <tr class="row-items">
                        <td class="cell-items">
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
                                                    <td class="col-des">{{ $ligne->description }}</td>
                                                    <td class="col-pu">{{ number_format($ligne->prix_unitaire, 2, ',', ' ') }}</td>
                                                    <td class="col-mt">{{ number_format($ligne->quantite * $ligne->prix_unitaire, 2, ',', ' ') }}</td>
                                            </tr>
                                            @endforeach

                                            @php $empty = max(0, 12 - $lignesPage->count()); @endphp
                                            @for($i = 0; $i < $empty; $i++)
                                            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                                            @endfor
                                    </tbody>
                            </table>
                        </td>
                    </tr>

                    <tr class="row-totals">
                        <td class="cell-totals">
                            @if(!$hasMultiplePages)
                                    <div class="totals-wrap">
                                            <div class="totals">
                                                    <div class="t-row">
                                                            <div class="t-label">TOTAL H.T.</div>
                                                            <div class="t-value">{{ number_format($totalHT, 2, ',', ' ') }}</div>
                                                    </div>
                                                    <div class="t-row">
                                                            <div class="t-label">T.V.A. 20 %</div>
                                                            <div class="t-value">{{ number_format($tva, 2, ',', ' ') }}</div>
                                                    </div>
                                                    <div class="t-row ttc">
                                                            <div class="t-label">TOTAL T.T.C.</div>
                                                            <div class="t-value">{{ number_format($ttc, 2, ',', ' ') }}</div>
                                                    </div>
                                            </div>
                                    </div>
                            @else
                                    &nbsp;
                            @endif
                        </td>
                    </tr>
                </tbody>
                </table>
            @else
                {{-- CONTINUATION PAGES: products table only + totals on last page ══ --}}
                <table class="inner-table">
                <tbody>
                    <tr class="row-items">
                        <td class="cell-items">
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
                                                    <td class="col-des">{{ $ligne->description }}</td>
                                                    <td class="col-pu">{{ number_format($ligne->prix_unitaire, 2, ',', ' ') }}</td>
                                                    <td class="col-mt">{{ number_format($ligne->quantite * $ligne->prix_unitaire, 2, ',', ' ') }}</td>
                                            </tr>
                                            @endforeach

                                            @php $empty = max(0, 12 - $lignesPage->count()); @endphp
                                            @for($i = 0; $i < $empty; $i++)
                                            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
                                            @endfor
                                    </tbody>
                            </table>
                        </td>
                    </tr>

                    @if($isLastPage)
                    <tr class="row-totals">
                        <td class="cell-totals">
                            <div class="totals-wrap">
                                    <div class="totals">
                                            <div class="t-row">
                                                    <div class="t-label">TOTAL H.T.</div>
                                                    <div class="t-value">{{ number_format($totalHT, 2, ',', ' ') }}</div>
                                            </div>
                                            <div class="t-row">
                                                    <div class="t-label">T.V.A. 20 %</div>
                                                    <div class="t-value">{{ number_format($tva, 2, ',', ' ') }}</div>
                                            </div>
                                            <div class="t-row ttc">
                                                    <div class="t-label">TOTAL T.T.C.</div>
                                                    <div class="t-value">{{ number_format($ttc, 2, ',', ' ') }}</div>
                                            </div>
                                    </div>
                            </div>
                        </td>
                    </tr>
                    @endif
                </tbody>
                </table>
            @endif

    </td>
  </tr>

    {{-- FOOTER — only at document end when multi-page ══ --}}
    @if($showFooter)
  <tr class="footer-row">
    <td class="footer-cell">
      54, Bd Chefchaouni Aïn Sebaâ &mdash; CASABLANCA<br>
      Tél&nbsp;: 022.35.33.82 / 022.66.17.87 &nbsp;&nbsp;|&nbsp;&nbsp; Fax&nbsp;: 022.66.17.87<br>
      I.F.&nbsp;: 1682364 &nbsp;·&nbsp; Patente&nbsp;: 31590255 &nbsp;·&nbsp; R.C.&nbsp;: 185015
      &nbsp;·&nbsp; C.N.S.S.&nbsp;: 7842702 &nbsp;·&nbsp; ICE&nbsp;: 000013024000074<br>
      E-mail&nbsp;: eqchefchaouni@gmail.com
    </td>
  </tr>
    @endif

</tbody>
</table>
</div>
@endforeach

</body>
</html>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 13px; color: #1C1C1E; padding: 40px; }

        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; color: #4F46E5; }
        .invoice-title { font-size: 28px; font-weight: bold; text-align: right; }
        .invoice-meta { text-align: right; color: #8E8E93; margin-top: 4px; }

        .section { margin-bottom: 30px; }
        .section-title { font-size: 11px; text-transform: uppercase; color: #8E8E93;
                         letter-spacing: 1px; margin-bottom: 8px; }

        .client-box { background: #F2F2F7; border-radius: 8px; padding: 14px; }
        .client-name { font-size: 16px; font-weight: bold; }
        .client-sub { color: #8E8E93; margin-top: 4px; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        thead tr { background: #4F46E5; color: white; }
        thead th { padding: 10px 12px; text-align: left; font-size: 12px; }
        tbody tr:nth-child(even) { background: #F9F9FB; }
        tbody td { padding: 10px 12px; border-bottom: 1px solid #E5E5EA; }

        .text-right { text-align: right; }
        .totals { margin-top: 20px; width: 260px; margin-left: auto; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0;
                      border-bottom: 1px solid #E5E5EA; }
        .totals-row.final { font-size: 16px; font-weight: bold; color: #4F46E5;
                            border-bottom: none; margin-top: 4px; }

        .footer { margin-top: 60px; text-align: center; color: #8E8E93; font-size: 11px;
                  border-top: 1px solid #E5E5EA; padding-top: 16px; }
    </style>
</head>
<body>

    {{-- Header --}}
    <div class="header">
        <div>
            <div class="company-name">Mon Entreprise</div>
            <div style="color:#8E8E93; margin-top:4px;">123 Rue Example, Casablanca</div>
            <div style="color:#8E8E93;">contact@entreprise.ma</div>
        </div>
        <div>
            <div class="invoice-title">FACTURE</div>
            <div class="invoice-meta">#{{ $devis->id }}</div>
            <div class="invoice-meta">Émis le : {{ $devis->date_emission }}</div>
            <div class="invoice-meta">Valide jusqu'au : {{ $devis->date_validite }}</div>
        </div>
    </div>

    {{-- Client --}}
    <div class="section">
        <div class="section-title">Facturé à</div>
        <div class="client-box">
            <div class="client-name">{{ $devis->client->nom }}</div>
            @if($devis->client->email)
                <div class="client-sub">{{ $devis->client->email }}</div>
            @endif
            @if($devis->client->telephone)
                <div class="client-sub">{{ $devis->client->telephone }}</div>
            @endif
        </div>
    </div>

    {{-- Lines table --}}
    <div class="section">
        <div class="section-title">Détail des prestations</div>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Qté</th>
                    <th class="text-right">Prix unitaire</th>
                    <th class="text-right">Remise</th>
                    <th class="text-right">Total HT</th>
                </tr>
            </thead>
            <tbody>
                @foreach($devis->lignes as $ligne)
                <tr>
                    <td>{{ $ligne->description }}</td>
                    <td class="text-right">{{ $ligne->quantite }}</td>
                    <td class="text-right">{{ number_format($ligne->prix_unitaire, 2) }} MAD</td>
                    <td class="text-right">{{ $ligne->remise ?? 0 }}%</td>
                    <td class="text-right">
                        {{ number_format($ligne->quantite * $ligne->prix_unitaire * (1 - ($ligne->remise ?? 0) / 100), 2) }} MAD
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>

    {{-- Totals --}}
    @php
        $totalHT = $devis->lignes->sum(fn($l) => $l->quantite * $l->prix_unitaire * (1 - ($l->remise ?? 0) / 100));
        $tva     = $totalHT * 0.20;
        $totalTTC = $totalHT + $tva;
    @endphp

    <div class="totals">
        <div class="totals-row">
            <span>Total HT</span>
            <span>{{ number_format($totalHT, 2) }} MAD</span>
        </div>
        <div class="totals-row">
            <span>TVA (20%)</span>
            <span>{{ number_format($tva, 2) }} MAD</span>
        </div>
        <div class="totals-row final">
            <span>Total TTC</span>
            <span>{{ number_format($totalTTC, 2) }} MAD</span>
        </div>
    </div>

    {{-- Footer --}}
    <div class="footer">
        Merci pour votre confiance — Mon Entreprise © {{ date('Y') }}
    </div>

</body>
</html>
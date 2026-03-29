<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$devis = App\Models\Devis::with(['client', 'lignes.produit'])->latest()->first();

if (!$devis) {
    echo "No devis found.\n";
    exit;
}

$pdf = app('dompdf.wrapper');
$pdf->loadView('pdf.invoice', compact('devis'));
$pdf->setPaper('a4', 'portrait');
$pdf->setOptions(['isHtml5ParserEnabled' => true, 'isRemoteEnabled' => true]);

file_put_contents(__DIR__.'/public/test-invoice.pdf', $pdf->output());
echo "PDF generated at /public/test-invoice.pdf\n";

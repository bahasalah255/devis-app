<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ProduitFactory extends Factory
{
    // Real products a Moroccan equipment company might sell
    private static array $produits = [
        ['libelle' => 'Cable électrique 2.5mm',   'description' => 'Cable cuivre souple 2.5mm²',        'prix' => 12.50,  'unite' => 'metre'],
        ['libelle' => 'Disjoncteur 16A',           'description' => 'Disjoncteur unipolaire 16A',         'prix' => 48.00,  'unite' => 'unite'],
        ['libelle' => 'Prise murale double',       'description' => 'Prise 2P+T 16A avec plaque',         'prix' => 35.00,  'unite' => 'unite'],
        ['libelle' => 'Interrupteur simple',       'description' => 'Interrupteur va-et-vient 10A',       'prix' => 22.00,  'unite' => 'unite'],
        ['libelle' => 'Tableau électrique 8 pos',  'description' => 'Coffret encastrable 8 modules',      'prix' => 320.00, 'unite' => 'unite'],
        ['libelle' => 'Tube IRL 16mm (3m)',        'description' => 'Conduit IRL rigide 16mm longueur 3m','prix' => 18.00,  'unite' => 'unite'],
        ['libelle' => 'Gaine souple TPC 20mm',     'description' => 'Gaine annelée TPC double paroi',     'prix' => 8.50,   'unite' => 'metre'],
        ['libelle' => 'Spot LED encastré 9W',      'description' => 'Spot encastrable blanc 9W 3000K',    'prix' => 65.00,  'unite' => 'unite'],
        ['libelle' => 'Installation electrique',   'description' => 'Main d\'oeuvre installation',        'prix' => 250.00, 'unite' => 'unite'],
        ['libelle' => 'Déplacement technicien',    'description' => 'Frais de déplacement',               'prix' => 80.00,  'unite' => 'unite'],
    ];

    private static int $index = 0;

    public function definition(): array
    {
        $p = self::$produits[self::$index % count(self::$produits)];
        self::$index++;

        return [
            'libelle'       => $p['libelle'],
            'description'   => $p['description'],
            'prix_unitaire' => $p['prix'],
            'tva'           => 20.00,
            'unite'         => $p['unite'],
        ];
    }
}

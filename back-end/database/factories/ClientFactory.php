<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nom'       => $this->faker->company(),
            'email'     => $this->faker->unique()->companyEmail(),
            'telephone' => $this->faker->numerify('06########'),
            'adresse'   => $this->faker->streetAddress() . ', ' . $this->faker->city(),
        ];
    }
}

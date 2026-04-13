<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Course;

$courses = Course::all();
echo "Fixing " . $courses->count() . " courses with Min Payment Plan...\n";

foreach ($courses as $c) {
    echo "Processing COURSE ID: {$c->id} | Price: {$c->price} | Min Price: {$c->min_price}\n";
    $c->enrollment_value = $c->price;
    $c->installments_count = $c->installments_count ?: 3;
    $c->installment_value = $c->price / $c->installments_count;
    $c->min_installment_value = $c->min_price / $c->installments_count;
    $c->save();
}

echo "Done!\n";

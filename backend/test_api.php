<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Course;

$course = Course::find(4);
if (!$course) {
    echo "Course not found\n";
    exit;
}

echo "COURSE ID 4 DETAILS:\n";
echo "price: " . $course->price . "\n";
echo "enrollment_value: " . $course->enrollment_value . "\n";
echo "installments_count: " . $course->installments_count . "\n";
echo "installment_value: " . $course->installment_value . "\n";

echo "\nTO ARRAY:\n";
print_r($course->toArray());

echo "\nTO JSON:\n";
echo $course->toJson() . "\n";

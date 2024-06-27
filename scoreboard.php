<?php
// Start output buffering
ob_start();

// Enable error reporting
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Function to log errors
function logError($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'error.log');
}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

$scoreboardFile = 'scoreboard.txt';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!file_exists($scoreboardFile)) {
            echo json_encode(['scores' => [], 'debug' => 'Scoreboard file does not exist']);
            exit;
        }
        $scores = file($scoreboardFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($scores === false) {
            throw new Exception("Failed to read scoreboard file");
        }
        $formattedScores = [];
        foreach ($scores as $score) {
            $parts = explode(',', $score);
            if (count($parts) === 2) {
                $formattedScores[] = ['name' => $parts[0], 'score' => (int)$parts[1]];
            }
        }
        usort($formattedScores, function($a, $b) {
            return $b['score'] - $a['score'];
        });
        echo json_encode(['scores' => array_slice($formattedScores, 0, 5), 'debug' => 'Success']);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        $name = isset($data['name']) ? $data['name'] : '';
        $score = isset($data['score']) ? (int)$data['score'] : 0;
        
        if ($name && $score) {
            if (file_put_contents($scoreboardFile, "$name,$score\n", FILE_APPEND) === false) {
                throw new Exception("Failed to write to file");
            }
            echo json_encode(['status' => 'success', 'debug' => 'Score saved']);
        } else {
            throw new Exception("Invalid data");
        }
    } else {
        throw new Exception("Method not allowed");
    }
} catch (Exception $e) {
    logError($e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage(), 'debug' => 'Exception caught']);
}

// Capture the output
$output = ob_get_clean();

// Check if there were any PHP errors
$phpErrors = error_get_last();
if ($phpErrors) {
    echo json_encode([
        'status' => 'error',
        'message' => 'PHP Error occurred',
        'debug' => $phpErrors,
        'output' => $output
    ]);
} else {
    echo $output;
}
<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: *");
header("Access-Control-Allow-Headers: *");

error_reporting(E_ALL);
ini_set('display_errors', 'stderr');
ini_set('error_log', 'error_log_save');
ini_set('log_errors', 'true');
ini_set('max_execution_time', 60);
ob_start();

// upload endpoint need to reassemble the file chunks by appending uploading
// content to the end of the file or correct chunk position if it already exists.

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (empty($_FILES)) {
        echo json_encode(array(
          'state' => 'Error',
          'response' => 'No data in the upload',
        ));
    } else {
        ob_start();
        $filename = $_FILES['file']['name'];
        $destination = './' . $filename;
        if (file_exists($filename)){
            // Append to the end of the existing file
            $new_chunk = file_get_contents($_FILES['file']['tmp_name']);
            echo "Exists " . $filename . "\n";
            echo json_encode($_POST);
            if ($new_chunk === false) {
                echo json_encode(array(
                  'state' => 'Error',
                  'response' => 'file_get_contents empty',
                ));
            }else{
                $file_dest = fopen($destination, 'c');
                // Append to the end of the file
                fwrite($file_dest, $new_chunk);
                // Move pointer to the end of the file
                if (fseek($file_dest, 0, SEEK_END) !== 0) {
                    echo json_encode(array(
                      'state' => 'Error',
                      'response' => 'fseek error',
                    ));
                }
            }
        }else{
            // First chunk upload
            echo "Chunk " . $filename . "\n";
            echo json_encode($_POST);
            move_uploaded_file(
                $_FILES['file']['tmp_name'],
                $destination
            );
        }
    }
}elseif ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    var_dump(http_response_code(200));
}else{
    echo json_encode(array(
      'state' => 'Error',
      'response' => $_SERVER['REQUEST_METHOD'],
    ));
}

?>

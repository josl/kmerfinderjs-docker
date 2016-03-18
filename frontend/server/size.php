<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: *");
header("Access-Control-Allow-Headers: *");

error_reporting(E_ALL);
ini_set('display_errors', 'stderr');
ini_set('error_log', 'error_log_size');
ini_set('log_errors', 'true');

ob_start();

// server endpoint to return uploaded file size so far on the server to be able
// to resume the upload from where it is ended. It should return zero if the
// file has not been uploaded yet.

// if resumeChunkSize _POST[] request has following values
// _chunckSize
// _chunkNumber (zero starting)
// _totalSize


if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (empty($_GET)) {
        echo json_encode(array(
          'state' => 'Error',
          'response' => 'No data in the upload',
        ));
    } else {
        ob_start();
        if (file_exists($_GET['file'])){
            echo filesize($_GET['file']);
        }else{
            // File empty at the moment
            echo 0;
        }
    }
}


?>

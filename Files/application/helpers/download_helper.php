<?php

if ( ! defined('BASEPATH')) exit('No direct script access allowed');
/**
 * Force Download
 *
 * Generates headers that force a download to happen
 *
 * @access    public
 * @param    string    filename
 * @param    mixed    the data to be downloaded
 * @return    void
 */
if ( ! function_exists('force_download'))
{
    function force_download($filename = '', $file = '', $delete_after = false, $decrypt = false, $decryptkey = '', $size = 0, $inline = false)
    {
        $CI =& get_instance();

        ini_set('max_execution_time', 21600); // 6 hours
        set_time_limit(0);

        if ($filename == '' OR $file == '')
        {
            error_log('Filename or path was empty');
            return FALSE;
        }

        if (FALSE === strpos($filename, '.'))
        {
            error_log('File does not have an extension');
            return FALSE;
        }

        $x = explode('.', $filename);
        $extension = end($x);

        $mimes = include(APPPATH.'config/mimes.php');

        if ( ! isset($mimes[$extension]))
        {
            $mime = 'application/octet-stream';
        }
        else
        {
            $mime = (is_array($mimes[$extension])) ? $mimes[$extension][0] : $mimes[$extension];
        }

        if($size == 0) {
            $size = filesize($file);
        }

        if($CI->config->item('use_alt_download') || $CI->config->item('use_alt_download') == 1) {
            // Generate the server headers
            if (strpos($_SERVER['HTTP_USER_AGENT'], "MSIE") !== FALSE)
            {
                header('Content-Type: '.$mime);
                header('Content-Disposition: '.($inline ? 'inline' : 'attachment').'; filename*=UTF-8\'\''.rawurlencode($filename).'; filename="'.$filename.'"');
                header('Expires: 0');
                header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
                header("Content-Transfer-Encoding: binary");
                header('Pragma: public');
                header("Content-Length: ".$size);
            }
            else
            {
                header('Content-Type: '.$mime);
                header('Content-Disposition: '.($inline ? 'inline' : 'attachment').'; filename*=UTF-8\'\''.rawurlencode($filename).'; filename="'.$filename.'"');
                header("Content-Transfer-Encoding: binary");
                header('Expires: 0');
                header('Pragma: no-cache');
                header("Content-Length: ".$size);
            }

            readfile_chunked_alt($file, $decrypt, $decryptkey);
        } else {
            $start = 0;
            $length = $size;
            $end = $size - 1;
            $status_code = 200;

            if (isset($_SERVER['HTTP_RANGE'])) {
                $range = $_SERVER['HTTP_RANGE'];
                list(, $range) = explode('=', $range, 2);
                if (strpos($range, ',') !== false) {
                    header('HTTP/1.1 416 Requested Range Not Satisfiable');
                    header("Content-Range: bytes */$size");
                    exit;
                }
                if ($range == '-') {
                    $start = 0;
                    $end = $size - 1;
                } else {
                    $range = explode('-', $range);
                    $start = $range[0];
                    $end = (isset($range[1]) && is_numeric($range[1])) ? $range[1] : $size - 1;
                }
                $length = $end - $start + 1;
                $status_code = 206;
            }

            if ($status_code == 206) {
                header('HTTP/1.1 206 Partial Content');
            }
            header('Content-Type: ' . $mime);
            header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename*=UTF-8\'\'' . rawurlencode($filename) . '; filename="' . $filename . '"');
            header("Content-Transfer-Encoding: binary");
            header('Expires: 0');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header("Content-Length: " . $length);
            if ($status_code == 206) {
                header("Content-Range: bytes $start-$end/$size");
            }

            readfile_chunked($file, $decrypt, $decryptkey, $start, $end);
        }

        if ($delete_after)
            unlink($file);

        die;
    }
}

if ( ! function_exists('readfile_chunked'))
{
    function readfile_chunked($file, $decrypt = FALSE, $decryptkey = '', $start = 0, $end = 0, $retbytes=TRUE)
    {
        session_write_close();

        if($decrypt) {
            $key = substr(sha1($decryptkey, true), 0, 16);
            $blocks = 10000;

            if ($fpIn = fopen($file, 'r')) {
                fseek($fpIn, $start);
                $iv = fread($fpIn, 16);

                while (!feof($fpIn) && ($pos = ftell($fpIn)) <= $end) {
                    $ciphertext = fread($fpIn, 16 * ($blocks + 1));
                    $plaintext = openssl_decrypt($ciphertext, 'AES-128-CBC', $key, OPENSSL_RAW_DATA, $iv);
                    $iv = substr($ciphertext, 0, 16);
                    echo $plaintext;
                    ob_flush();
                    flush();
                }
                return fclose($fpIn);
            }
            else
            {
                error_log('Could not open source file');
                return false;
            }
        }
        else
        {
            $chunksize = 1 * (1024 * 1024);
            $cnt = 0;

            $handle = fopen($file, 'r');
            if ($handle === FALSE)
            {
                return FALSE;
            }

            fseek($handle, $start);

            while ( ! feof($handle) && ($pos = ftell($handle)) <= $end)
            {
                $buffer = fread($handle, min($chunksize, $end - $pos + 1));
                echo $buffer;
                ob_flush();
                flush();

                if ($retbytes)
                {
                    $cnt += strlen($buffer);
                }
            }

            $status = fclose($handle);

            if ($retbytes AND $status)
            {
                return $cnt;
            }

            return $status;
        }
    }
}

/**
 * readfile_chunked_alt
 *
 * Alternative method
 * Reads file in chunks so big downloads are possible without changing PHP.INI
 *
 * @access    public
 * @param    string    file
 * @param    boolean    return bytes of file
 * @return    void
 */
if ( ! function_exists('readfile_chunked_alt'))
{
    function readfile_chunked_alt($file, $decrypt = FALSE, $decryptkey = '', $retbytes=TRUE)
    {
        session_write_close();

        if($decrypt) {
            $key = substr(sha1($decryptkey, true), 0, 16);
            $blocks = 10000;

            if ($fpIn = fopen($file, 'r')) {
                // Get the initialzation vector from the beginning of the file
                $iv = fread($fpIn, 16);

                while (!feof($fpIn)) {
                    $ciphertext = fread($fpIn, 16 * ($blocks + 1)); // we have to read one block more for decrypting than for encrypting
                    $plaintext = openssl_decrypt($ciphertext, 'AES-128-CBC', $key, OPENSSL_RAW_DATA, $iv);

                    // Use the first 16 bytes of the ciphertext as the next initialization vector
                    $iv = substr($ciphertext, 0, 16);

                    //echo $plaintext;
                    echo $plaintext;
                    ob_flush();
                    flush();
                }
                fclose($fpIn);
            }
            else
            {
                error_log('Could not open source file');
            }
        }
        else
        {
            $chunksize = 1 * (1024 * 1024);
            $cnt = 0;

            $handle = fopen($file, 'r');
            if ($handle === FALSE)
            {
                return FALSE;
            }

            while ( ! feof($handle))
            {
                $buffer = fread($handle, $chunksize);
                echo $buffer;
                ob_flush();
                flush();

                if ($retbytes)
                {
                    $cnt += strlen($buffer);
                }
            }

            $status = fclose($handle);

            if ($retbytes AND $status)
            {
                return $cnt;
            }

            return $status;
        }
    }
}
<?php

class DeepL
{

    /** @var modX $modx */
    public $modx;


    /**
     * @param modX $modx
     * @param array $config
     */
    public function __construct(modX $modx, array $config = [])
    {
        $this->modx = $modx;

        $this->config = array_merge(array(
            'key' => $this->modx->getOption('localizator_key_deepl')
        ), $config);
    }


    /**
     * @param string $text
     * @param string $from
     * @param string $to
     *
     * @return string
     */
    public function translate($text, $from, $to)
    {

        if (empty($this->config['key'])) {
            $this->modx->log(1, 'localizator: ' . $this->modx->lexicon('localizator_item_err_deepl_key'));
            return '';
        }

        if (!$text) return '';
        $output = '';
        $data = array(
            'source_lang' => strtoupper($from),
            'target_lang' => strtoupper($to),
            'text'        => $text,
        );

        $ch = curl_init('https://api.deepl.com/v2/translate?auth_key=' . $this->config['key']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            $this->modx->log(1, 'localizator: Deepl translate curl error');
            return '';
        }

        $response = json_decode($response, true);

        if ($httpCode == 200 && isset($response['translations'][0]['text'])) {
            $output = $response['translations'][0]['text'];
        } else {
            $msg = isset($response['message']) ? $response['message'] : ('HTTP ' . $httpCode);
            $this->modx->log(1, 'localizator: Deepl translate error - ' . $msg);
        }

        return $output;
    }
}

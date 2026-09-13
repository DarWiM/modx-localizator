<?php

class DeepL
{

    /** @var modX $modx */
    public $modx;
    public $lastError = '';


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
     * @return string
     */
    protected function getEndpoint()
    {
        return substr((string) $this->config['key'], -3) === ':fx'
            ? 'https://api-free.deepl.com'
            : 'https://api.deepl.com';
    }


    /**
     * @param string $text
     * @param string $from
     * @param string $to
     *
     * @return string|false
     */
    public function translate($text, $from, $to)
    {
        $this->lastError = '';

        if (empty($this->config['key'])) {
            $this->lastError = $this->modx->lexicon('localizator_item_err_deepl_key');
            $this->modx->log(1, 'localizator: ' . $this->lastError);
            return false;
        }

        if (!$text) return '';
        $output = '';
        $data = array(
            'source_lang' => strtoupper($from),
            'target_lang' => strtoupper($to),
            'text'        => $text,
        );

        $ch = curl_init($this->getEndpoint() . '/v2/translate');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, array(
            'Authorization: DeepL-Auth-Key ' . $this->config['key'],
            'Content-Type: application/x-www-form-urlencoded',
        ));
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            $this->lastError = 'Deepl translate curl error' . ($curlError ? ': ' . $curlError : '');
            $this->modx->log(1, 'localizator: ' . $this->lastError);
            return false;
        }

        $response = json_decode($response, true);

        if ($httpCode == 200 && isset($response['translations'][0]['text'])) {
            $output = $response['translations'][0]['text'];
        } else {
            $msg = isset($response['message']) ? $response['message'] : ('HTTP ' . $httpCode);
            $this->lastError = 'Deepl translate error - ' . $msg;
            $this->modx->log(1, 'localizator: ' . $this->lastError);
            return false;
        }

        return $output;
    }
}

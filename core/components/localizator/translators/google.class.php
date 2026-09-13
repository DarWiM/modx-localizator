<?php

class Google
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
			'key' => $this->modx->getOption('localizator_key_google')
		), $config);
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
			$this->lastError = $this->modx->lexicon('localizator_item_err_google_key');
			$this->modx->log(1, 'localizator: ' . $this->lastError);
			return false;
		}

		if (!$text) return '';
		$output = '';
		$data = array(
			'key' 		=> $this->config['key'],
			'source' 	=> $from,
			'target' 	=> $to,
			'q' 		=> $text,
			'format' 	=> 'html',
		);

		$ch = curl_init('https://www.googleapis.com/language/translate/v2');
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
		curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data, '', '&'));
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		$response = curl_exec($ch);
		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		$curlError = curl_error($ch);
		curl_close($ch);

		if ($response === false) {
			$this->lastError = 'google translate curl error' . ($curlError ? ': ' . $curlError : '');
			$this->modx->log(1, 'localizator: ' . $this->lastError);
			return false;
		}

		$response = json_decode($response, true);
		if ($httpCode == 200 && isset($response['data']['translations'][0]['translatedText'])) {
			$output = $response['data']['translations'][0]['translatedText'];
		} else {
			$msg = isset($response['error']['errors'][0]['message']) ? $response['error']['errors'][0]['message'] : ('HTTP ' . $httpCode);
			$this->lastError = 'google translate error - ' . $msg;
			$this->modx->log(1, 'localizator: ' . $this->lastError);
			return false;
		}

		return $output;
	}
}

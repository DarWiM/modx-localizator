<?php

class Yandex
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
			'key' => $this->modx->getOption('localizator_key_yandex')
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

		if (!$this->config['key']) {
			$this->lastError = $this->modx->lexicon('localizator_item_err_yandex_key');
			$this->modx->log(1, 'localizator: ' . $this->lastError);
			return false;
		}

		if (!$text) return;
		$output = '';
		$data = array(
			'key' => $this->config['key'],
			'lang' => $from . '-' . $to,
			'format' => 'html',
		);

		// doc  
		// https://tech.yandex.ru/translate/doc/dg/concepts/About-docpage/
		$text = $this->prepare_text($text);
		foreach ($text as $part) {
			$data['text'] = $part;
			$ch = curl_init('https://translate.yandex.net/api/v1.5/tr.json/translate');
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
				$this->lastError = 'yandex translate curl error' . ($curlError ? ': ' . $curlError : '');
				$this->modx->log(1, 'localizator: ' . $this->lastError);
				return false;
			}

			$response = json_decode($response, true);
			if ($httpCode == 200 && isset($response['code']) && $response['code'] == 200 && isset($response['text'])) {
				$output .= implode('', $response['text']);
			} else {
				$msg = isset($response['message']) ? $response['message'] : ('HTTP ' . $httpCode);
				$this->lastError = 'yandex error - ' . $msg;
				$this->modx->log(1, 'localizator: ' . $this->lastError);
				return false;
			}
		}

		return $output;
	}


	/**
	 * @param string $text
	 * @param int $limit 
	 *
	 * @return array
	 */
	public function prepare_text($text, $limit = 2000)
	{
		if ($limit > 0) {
			$ret = array();
			$limiten = mb_strlen($text, "UTF-8");
			for ($i = 0; $i < $limiten; $i += $limit) {
				$ret[] = mb_substr($text, $i, $limit, "UTF-8");
			}
			return $ret;
		}
		return preg_split("//u", $text, -1, PREG_SPLIT_NO_EMPTY);
	}
}

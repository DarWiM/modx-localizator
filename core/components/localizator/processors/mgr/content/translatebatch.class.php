<?php

class localizatorContentTranslateBatchProcessor extends modProcessor
{
    public function process()
    {
        $resourceId = (int) $this->getProperty('resource_id');
        if (!$resourceId) {
            return $this->failure('Не указан id ресурса');
        }

        if (!$this->modx->getObject('modResource', array('id' => $resourceId))) {
            return $this->failure('Ресурс не найден');
        }

        $localizator = $this->modx->getService('localizator');
        if (!$localizator || empty($localizator->config['processorsPath'])) {
            return $this->failure('Не удалось загрузить сервис localizator');
        }

        $properties = array_merge($this->getProperties(), array('resource_id' => $resourceId));
        $response = $this->modx->runProcessor(
            'mgr/content/translate',
            $properties,
            array('processors_path' => $localizator->config['processorsPath'])
        );

        if (!$response || $response->isError()) {
            $msg = $response ? $response->getMessage() : 'Ошибка при выполнении перевода';
            return $this->failure($msg);
        }

        return $this->success('', array('resource_id' => $resourceId));
    }
}

return 'localizatorContentTranslateBatchProcessor';

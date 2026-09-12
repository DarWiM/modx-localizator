<?php

class localizatorContentSelectionProcessor extends modProcessor
{
    public function process()
    {
        $includeRaw = $this->getProperty('include_ids');
        $excludeRaw = $this->getProperty('exclude_ids');

        $includeIds = $this->parseIds($includeRaw);
        $excludeIds = $this->parseIds($excludeRaw);

        $baseIds = array();
        $c = $this->modx->newQuery('modResource');
        $c->select($this->modx->escape('id'));
        $c->where(array(
            'published' => 1,
            'deleted' => 0,
        ));
        if ($c->prepare() && $c->stmt->execute()) {
            $baseIds = $c->stmt->fetchAll(PDO::FETCH_COLUMN);
            $baseIds = array_map('intval', $baseIds);
        }

        if (!empty($excludeIds)) {
            $baseIds = array_diff($baseIds, $excludeIds);
        }

        $combinedIds = array_unique(array_merge($baseIds, $includeIds));

        $finalIds = array();
        if (!empty($combinedIds)) {
            $cVal = $this->modx->newQuery('modResource');
            $cVal->select($this->modx->escape('id'));
            $cVal->where(array(
                'id:IN' => array_values($combinedIds),
            ));
            if ($cVal->prepare() && $cVal->stmt->execute()) {
                $validIds = $cVal->stmt->fetchAll(PDO::FETCH_COLUMN);
                $finalIds = array_map('intval', $validIds);
            }
        }

        sort($finalIds, SORT_NUMERIC);

        return $this->success('', array('ids' => array_values($finalIds)));
    }

    protected function parseIds($val)
    {
        if (empty($val)) {
            return array();
        }
        if (is_string($val)) {
            $decoded = json_decode($val, true);
            if (is_array($decoded)) {
                $val = $decoded;
            } else {
                $val = explode(',', $val);
            }
        }
        if (!is_array($val)) {
            return array();
        }

        $ids = array();
        foreach ($val as $v) {
            $id = (int)$v;
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        return array_unique($ids);
    }
}

return 'localizatorContentSelectionProcessor';

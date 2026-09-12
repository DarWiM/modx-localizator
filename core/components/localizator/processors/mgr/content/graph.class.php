<?php

class localizatorContentGraphProcessor extends modProcessor
{
    public function process()
    {
        $c = $this->modx->newQuery('modResource');
        $c->select('id,parent,context_key,published,deleted');
        $c->sortby('id', 'ASC');

        $resources = array();
        foreach ($this->modx->getIterator('modResource', $c) as $resource) {
            $resources[] = array(
                'id' => (int)$resource->get('id'),
                'parent' => (int)$resource->get('parent'),
                'context_key' => (string)$resource->get('context_key'),
                'defaultChecked' => (bool)($resource->get('published') && !$resource->get('deleted')),
            );
        }

        return $this->success('', array('resources' => $resources));
    }
}

return 'localizatorContentGraphProcessor';

<?php

require_once MODX_CORE_PATH . 'model/modx/processors/resource/getnodes.class.php';

class localizatorContentTreeProcessor extends modResourceGetNodesProcessor
{
    public function getResourceQuery()
    {
        $resourceColumns = array(
            'id', 'template', 'pagetitle', 'longtitle', 'alias', 'description',
            'parent', 'published', 'deleted', 'isfolder', 'menuindex', 'menutitle',
            'hidemenu', 'class_key', 'context_key', 'hide_children_in_tree',
        );
        $this->itemClass = 'modResource';
        $c = $this->modx->newQuery($this->itemClass);
        $c->select($this->modx->getSelectColumns('modResource', 'modResource', '', $resourceColumns));
        $c->select(array(
            'childrenCount' => "(SELECT COUNT(*) FROM {$this->modx->getTableName('modResource')} WHERE parent = modResource.id)",
        ));
        $c->where(array('context_key' => $this->contextKey));

        if (empty($this->startNode) && !empty($this->defaultRootId)) {
            $c->where(array(
                'id:IN' => explode(',', $this->defaultRootId),
                'parent:NOT IN' => explode(',', $this->defaultRootId),
            ));
        } else {
            $c->where(array('parent' => $this->startNode));
        }

        $sortBy = $this->modx->escape($this->getProperty('sortBy'));
        $c->sortby('modResource.' . $sortBy, $this->getProperty('sortDir'));
        return $c;
    }

    public function prepareResourceNode(modResource $resource)
    {
        $hideChildrenInTree = $resource->get('hide_children_in_tree');
        $resource->set('hide_children_in_tree', false);
        $itemArray = parent::prepareResourceNode($resource);
        $resource->set('hide_children_in_tree', $hideChildrenInTree);
        if (!empty($itemArray)) {
            $isChecked = (bool) ($resource->get('published') && !$resource->get('deleted'));
            $itemArray['checked'] = $isChecked;
            $itemArray['defaultChecked'] = $isChecked;
        }
        return $itemArray;
    }
}

return 'localizatorContentTreeProcessor';

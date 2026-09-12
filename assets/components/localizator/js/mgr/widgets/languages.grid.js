localizator.grid.Language = function (config) {
    config = config || {};
    if (!config.id) {
        config.id = 'localizator-grid-language';
    }
    Ext.applyIf(config, {
        url: localizator.config.connector_url,
        fields: this.getFields(config),
        columns: this.getColumns(config),
        tbar: this.getTopBar(config),
        sm: new Ext.grid.CheckboxSelectionModel(),
        baseParams: {
            action: 'mgr/language/getlist'
        },
        listeners: {
            rowDblClick: function (grid, rowIndex, e) {
                var row = grid.store.getAt(rowIndex);
                this.updateItem(grid, e, row);
            }
        },
        viewConfig: {
            forceFit: true,
            enableRowBody: true,
            autoFill: true,
            showPreview: true,
            scrollOffset: 0,
            getRowClass: function (rec) {
                return !rec.data.active
                    ? 'localizator-grid-row-disabled'
                    : '';
            }
        },
        paging: true,
        remoteSort: true,
        autoHeight: true,
    });
    localizator.grid.Language.superclass.constructor.call(this, config);

    // Clear selection on grid refresh
    this.store.on('load', function () {
        if (this._getSelectedIds().length) {
            this.getSelectionModel().clearSelections();
        }
    }, this);
};
Ext.extend(localizator.grid.Language, MODx.grid.Grid, {
    windows: {},

    getMenu: function (grid, rowIndex) {
        var ids = this._getSelectedIds();

        var row = grid.getStore().getAt(rowIndex);
        var menu = localizator.utils.getMenu(row.data['actions'], this, ids);

        this.addContextMenuItem(menu);
    },

    createItem: function (btn, e) {
        var w = MODx.load({
            xtype: 'localizator-language-window-create',
            id: Ext.id(),
            listeners: {
                success: {
                    fn: function () {
                        this.refresh();
                    }, scope: this
                }
            }
        });
        w.reset();
        w.setValues({active: true});
        w.show(e.target);
    },

    updateItem: function (btn, e, row) {
        if (typeof(row) != 'undefined') {
            this.menu.record = row.data;
        }
        else if (!this.menu.record) {
            return false;
        }
        var id = this.menu.record.id;

        MODx.Ajax.request({
            url: this.config.url,
            params: {
                action: 'mgr/language/get',
                id: id
            },
            listeners: {
                success: {
                    fn: function (r) {
                        var w = MODx.load({
                            xtype: 'localizator-language-window-update',
                            id: Ext.id(),
                            record: r,
                            listeners: {
                                success: {
                                    fn: function () {
                                        this.refresh();
                                    }, scope: this
                                }
                            }
                        });
                        w.reset();
                        w.setValues(r.object);
                        w.show(e.target);
                    }, scope: this
                }
            }
        });
    },

    removeItem: function () {
        var ids = this._getSelectedIds();
        if (!ids.length) {
            return false;
        }
        MODx.msg.confirm({
            title: ids.length > 1
                ? _('localizator_items_remove')
                : _('localizator_item_remove'),
            text: ids.length > 1
                ? _('localizator_items_remove_confirm')
                : _('localizator_item_remove_confirm'),
            url: this.config.url,
            params: {
                action: 'mgr/language/remove',
                ids: Ext.util.JSON.encode(ids),
            },
            listeners: {
                success: {
                    fn: function () {
                        this.refresh();
                    }, scope: this
                }
            }
        });
        return true;
    },

    disableItem: function () {
        var ids = this._getSelectedIds();
        if (!ids.length) {
            return false;
        }
        MODx.Ajax.request({
            url: this.config.url,
            params: {
                action: 'mgr/language/disable',
                ids: Ext.util.JSON.encode(ids),
            },
            listeners: {
                success: {
                    fn: function () {
                        this.refresh();
                    }, scope: this
                }
            }
        })
    },

    enableItem: function () {
        var ids = this._getSelectedIds();
        if (!ids.length) {
            return false;
        }
        MODx.Ajax.request({
            url: this.config.url,
            params: {
                action: 'mgr/language/enable',
                ids: Ext.util.JSON.encode(ids),
            },
            listeners: {
                success: {
                    fn: function () {
                        this.refresh();
                    }, scope: this
                }
            }
        })
    },

    getFields: function () {
        return ['id', 'key', 'name', 'http_host', 'cultureKey', 'active', 'actions'];
    },

    getColumns: function () {
        return [{
            header: _('localizator_key'),
            dataIndex: 'key',
            sortable: true,
            width: 200,
        }, {
            header: _('localizator_language_name'),
            dataIndex: 'name',
            sortable: true,
            width: 200,
        }, {
            header: _('localizator_language_http_host'),
            dataIndex: 'http_host',
            sortable: true,
            width: 200,
        }, {
            header: _('localizator_language_cultureKey'),
            dataIndex: 'cultureKey',
            sortable: true,
            width: 200,
        }, {
            header: _('localizator_active'),
            dataIndex: 'active',
            renderer: localizator.utils.renderBoolean,
            sortable: true,
            width: 100,
        }, {
            header: _('localizator_grid_actions'),
            dataIndex: 'actions',
            renderer: localizator.utils.renderActions,
            sortable: false,
            width: 100,
            id: 'actions'
        }];
    },

    getTopBar: function () {
        return [{
            text: '<i class="icon icon-globe"></i>&nbsp;' + _('localizator_language_create'),
            handler: this.createItem,
            scope: this
        }, {
            text: '<i class="icon icon-language"></i>&nbsp;' + _('localizator_translate_site'),
            handler: this.translateSite,
            scope: this
        }, '->', {
            xtype: 'localizator-field-search',
            width: 250,
            listeners: {
                search: {
                    fn: function (field) {
                        this._doSearch(field);
                    }, scope: this
                },
                clear: {
                    fn: function (field) {
                        field.setValue('');
                        this._clearSearch();
                    }, scope: this
                },
            }
        }];
    },

    translateSite: function () {
        var include_ids = [];
        var exclude_ids = [];
        var branchStates = {};
        var graph = {resources: {}, children: {}, contexts: {}};
        var graphReady = false;
        var graphError = false;
        var suppressCheckchange = false;

        var addUnique = function (list, id) {
            if (list.indexOf(id) === -1) list.push(id);
        };
        var removeId = function (list, id) {
            var index = list.indexOf(id);
            if (index !== -1) list.splice(index, 1);
        };
        var nodeKey = function (node) {
            if (node.attributes.type === 'modContext') return 'ctx:' + node.attributes.pk;
            return String(node.attributes.pk);
        };
        var resourceKey = function (contextKey, parentId) {
            return contextKey + ':' + parentId;
        };
        var collectBranchIds = function (key) {
            var ids = [], seen = {};
            var visit = function (id) {
                id = String(id);
                if (seen[id] || !graph.resources[id]) return;
                seen[id] = true;
                ids.push(id);
                var resource = graph.resources[id];
                Ext.each(graph.children[resourceKey(resource.context_key, id)] || [], visit);
            };

            if (key.indexOf('ctx:') === 0) {
                Ext.each(graph.contexts[key.substr(4)] || [], visit);
            } else {
                visit(key);
            }
            return ids;
        };
        var branchScopeIds = function (key) {
            var ids = collectBranchIds(key);
            if (key.indexOf('ctx:') !== 0) ids.shift();
            return ids;
        };
        var isBranch = function (node) {
            return branchScopeIds(nodeKey(node)).length > 0;
        };
        var hasBranchState = function (key) {
            return Object.prototype.hasOwnProperty.call(branchStates, key);
        };
        var activeBranchState = function (id) {
            var resource = graph.resources[String(id)];
            if (!resource) return 'default';

            var parentId = resource.parent;
            while (parentId > 0) {
                if (hasBranchState(String(parentId))) {
                    return branchStates[String(parentId)];
                }
                var parent = graph.resources[String(parentId)];
                if (!parent) break;
                parentId = parent.parent;
            }

            var contextKey = 'ctx:' + resource.context_key;
            return hasBranchState(contextKey) ? branchStates[contextKey] : 'default';
        };
        var setCheckboxState = function (element, state) {
            if (!element) return;
            var domElement = element.dom || element;
            var checkbox = Ext.fly(domElement);
            checkbox.removeClass(['x-tree-node-checked', 'x-tree-node-grayed']);

            // MODX 2.8 renders resource controls as native inputs. Updating only
            // the legacy tree CSS classes leaves their checked property stale.
            if (domElement.type === 'checkbox') {
                domElement.checked = state === true;
                if (typeof domElement.indeterminate !== 'undefined') {
                    domElement.indeterminate = state === null;
                }
                return;
            }

            if (state === true) checkbox.addClass('x-tree-node-checked');
            if (state === null) checkbox.addClass('x-tree-node-grayed');
        };
        var setResourceVisualState = function (node, state) {
            if (node.ui && node.ui.checkbox) {
                setCheckboxState(node.ui.checkbox, state);
            }
            node.attributes.checked = state;
        };
        var setBranchVisualState = function (node, state) {
            if (node._localizatorBranchCheckbox) {
                setCheckboxState(node._localizatorBranchCheckbox, state);
            }
            node._localizatorBranchVisual = state;
        };
        var ensureResourceCheckbox = function (node) {
            if (!node.ui || !node.ui.elNode || node.attributes.type !== 'modResource') return;
            if (node.ui.checkbox) return;

            var checkbox = document.createElement('img');
            checkbox.src = node.ui.emptyIcon || Ext.BLANK_IMAGE_URL;
            checkbox.className = 'x-tree-checkbox';
            checkbox.title = _('localizator_select_resource');
            var reference = node.ui.anchor || node.ui.textNode;
            if (reference && reference.parentNode) {
                reference.parentNode.insertBefore(checkbox, reference);
            } else {
                node.ui.elNode.appendChild(checkbox);
            }
            node.ui.checkbox = checkbox;
        };
        var effectiveChecked = function (id) {
            id = String(id);
            if (exclude_ids.indexOf(id) !== -1) return false;
            if (include_ids.indexOf(id) !== -1) return true;

            var branchState = activeBranchState(id);
            if (branchState === 'include') return true;
            if (branchState === 'exclude') return false;

            return !!(graph.resources[id] && graph.resources[id].defaultChecked);
        };
        var refreshResourceVisual = function (node) {
            if (!node.attributes.pk || node.attributes.type !== 'modResource') return;
            ensureResourceCheckbox(node);
            setResourceVisualState(node, effectiveChecked(node.attributes.pk));
        };
        var toggleBranch = function (node) {
            var current = node._localizatorBranchVisual;
            setBranchState(node, current === null || current === false ? 'include' : 'exclude');
            refreshLoadedBranchVisuals();
        };
        var ensureBranchCheckbox = function (node) {
            if (!node.ui || !node.ui.elNode || !isBranch(node)) return;
            if (node._localizatorBranchCheckbox) return;

            var checkbox = document.createElement('img');
            checkbox.src = node.ui.emptyIcon || Ext.BLANK_IMAGE_URL;
            checkbox.className = 'x-tree-checkbox localizator-tree-branch-checkbox';
            checkbox.title = _('localizator_select_branch');
            var reference = node.ui.checkbox || node.ui.iconNode;
            if (reference && reference.parentNode) {
                reference.parentNode.insertBefore(checkbox, reference.nextSibling);
            } else {
                node.ui.elNode.appendChild(checkbox);
            }
            node._localizatorBranchCheckbox = checkbox;
            Ext.get(checkbox).on('click', function (event) {
                event.stopEvent();
                toggleBranch(node);
            });
        };
        var refreshBranchVisual = function (node) {
            if (!graphReady || !isBranch(node)) return;
            ensureBranchCheckbox(node);
            var ids = branchScopeIds(nodeKey(node));
            var selected = 0;
            Ext.each(ids, function (id) {
                if (effectiveChecked(id)) selected++;
            });
            var visualState = selected === 0 ? false : selected === ids.length ? true : null;
            suppressCheckchange = true;
            setBranchVisualState(node, visualState);
            suppressCheckchange = false;
        };
        var refreshLoadedBranchVisuals = function () {
            if (!tree || !tree.getRootNode()) return;
            tree.getRootNode().cascade(function (node) {
                refreshResourceVisual(node);
                refreshBranchVisual(node);
            });
        };
        var clearBranchOverrides = function (ids) {
            Ext.each(ids, function (id) {
                removeId(include_ids, id);
                removeId(exclude_ids, id);
                delete branchStates[id];
            });
        };
        var setBranchState = function (node, state) {
            var key = nodeKey(node);
            var ids = branchScopeIds(key);
            clearBranchOverrides(ids);
            branchStates[key] = state;
            refreshLoadedBranchVisuals();
        };
        var resetBranchState = function (node) {
            var key = nodeKey(node);
            var ids = branchScopeIds(key);
            clearBranchOverrides(ids);
            // Keep an explicit default boundary so an ancestor branch cannot leak into this subtree.
            branchStates[key] = 'default';
            refreshLoadedBranchVisuals();
        };
        var getSelectionIds = function () {
            var finalInclude = [], finalExclude = [];
            for (var id in graph.resources) {
                if (!Object.prototype.hasOwnProperty.call(graph.resources, id)) continue;
                var selected = effectiveChecked(id);
                var defaultChecked = !!graph.resources[id].defaultChecked;
                if (selected && !defaultChecked) addUnique(finalInclude, id);
                if (!selected && defaultChecked) addUnique(finalExclude, id);
            }
            return {include: finalInclude, exclude: finalExclude};
        };
        var refreshNodeVisuals = function (node) {
            refreshResourceVisual(node);
            refreshBranchVisual(node);
        };
        var LocalizatorNodeUI = Ext.extend(Ext.tree.TreeNodeUI, {
            renderElements: function () {
                LocalizatorNodeUI.superclass.renderElements.apply(this, arguments);
                refreshNodeVisuals(this.node);
            }
        });
        var onResourceCheckchange = function (node, checked) {
            if (suppressCheckchange || !graphReady || node.attributes.type !== 'modResource') return;
            var id = String(node.attributes.pk);
            var branchState = activeBranchState(id);
            if (branchState === 'include') {
                if (checked) removeId(exclude_ids, id);
                else addUnique(exclude_ids, id);
                removeId(include_ids, id);
            } else if (branchState === 'exclude') {
                if (checked) addUnique(include_ids, id);
                else removeId(include_ids, id);
                removeId(exclude_ids, id);
            } else if (node.attributes.defaultChecked) {
                if (!checked) addUnique(exclude_ids, id);
                else removeId(exclude_ids, id);
            } else if (checked) {
                addUnique(include_ids, id);
            } else {
                removeId(include_ids, id);
            }
            refreshLoadedBranchVisuals();
        };
        var toggleResourceSelection = function (node) {
            if (!node.attributes.pk || node.attributes.type !== 'modResource') return;
            onResourceCheckchange(node, !effectiveChecked(node.attributes.pk));
        };

        var tree = MODx.load({
            xtype: 'modx-tree-resource-simple',
            url: this.config.url,
            action: 'mgr/content/tree',
            loaderConfig: {
                baseAttrs: {
                    uiProvider: LocalizatorNodeUI
                }
            },
            height: 420,
            autoHeight: false,
            autoScroll: true,
            rootVisible: true,
            nohref: true,
            noHref: true,
            disableHref: true,
            tbar: [],
            enableDD: false,
            enableDrop: false,
            enableDrag: false,
            useToolbar: false,
            useContextMenu: false,
            listeners: {
                append: function (tree, parent, node) {
                    if (node.ui && node.ui.updateParent) node.ui.updateParent = Ext.emptyFn;
                    ensureResourceCheckbox(node);
                    refreshNodeVisuals(node);
                },
                contextmenu: function (node, event) {
                    if (!graphReady || (node.attributes.type !== 'modResource' && !isBranch(node))) return;
                    event.stopEvent();
                    var items = [];
                    if (node.attributes.type === 'modResource') {
                        items.push({
                            text: effectiveChecked(node.attributes.pk)
                                ? _('localizator_deselect_resource')
                                : _('localizator_select_resource'),
                            handler: function () {
                                toggleResourceSelection(node);
                            }
                        });
                    }
                    if (isBranch(node)) {
                        if (items.length) items.push('-');
                        items.push({
                            text: node._localizatorBranchVisual === true
                                ? _('localizator_deselect_branch')
                                : _('localizator_select_branch'),
                            handler: function () {
                                setBranchState(node, node._localizatorBranchVisual === true ? 'exclude' : 'include');
                            }
                        });
                        items.push({
                            text: _('localizator_reset_branch'),
                            handler: function () {
                                resetBranchState(node);
                            }
                        });
                    }
                    new Ext.menu.Menu({
                        items: items
                    }).showAt(event.getXY());
                },
                checkchange: function (node, checked) {
                    onResourceCheckchange(node, checked);
                }
            }
        });
        // The base MODX tree adds create/refresh buttons from its append listener.
        tree.un('append', tree._onAppend, tree);
        tree.addNodeButtons = Ext.emptyFn;
        tree.getMenu = Ext.emptyFn;

        MODx.Ajax.request({
            url: this.config.url,
            params: {action: 'mgr/content/graph'},
            listeners: {
                success: {
                    fn: function (response) {
                        Ext.each(response.object.resources || [], function (resource) {
                            var id = String(resource.id);
                            var parentKey = resourceKey(resource.context_key, resource.parent);
                            graph.resources[id] = resource;
                            graph.children[parentKey] = graph.children[parentKey] || [];
                            graph.children[parentKey].push(id);
                            graph.contexts[resource.context_key] = graph.contexts[resource.context_key] || [];
                            graph.contexts[resource.context_key].push(id);
                        });
                        graphReady = true;
                        refreshLoadedBranchVisuals();
                    }, scope: this
                },
                failure: {
                    fn: function (response) {
                        graphError = true;
                        MODx.msg.alert(_('error'), response.message);
                    }, scope: this
                }
            }
        });

        var dialog = new MODx.Window({
            title: _('localizator_translate_site'), width: 700, autoHeight: true,
            fields: [{
                xtype: 'container',
                border: false,
                items: [tree, {xtype: 'xcheckbox', id: 'localizator-translate-lexicon-cb', name: 'translate_lexicon', checked: true,
                    boxLabel: _('localizator_translate_lexicon_after')}]
            }],
            buttons: [{text: _('cancel'), handler: function () { dialog.close(); }}, {
                text: _('localizator_translate'), handler: function () {
                    if (!graphReady) {
                        MODx.msg.alert(_('error'), graphError ? _('error') : _('localizator_translate_wait'));
                        return;
                    }
                    var selection = getSelectionIds();
                    var translateLexicon = Ext.getCmp('localizator-translate-lexicon-cb').getValue();
                    MODx.Ajax.request({
                        url: this.config.url,
                        params: {
                            action: 'mgr/content/selection',
                            include_ids: Ext.util.JSON.encode(selection.include),
                            exclude_ids: Ext.util.JSON.encode(selection.exclude)
                        },
                        listeners: {
                            success: {
                                fn: function (response) {
                                    dialog.close();
                                    this._translateResources(response.object.ids, translateLexicon);
                                }, scope: this
                            },
                            failure: {
                                fn: function (r) {
                                    MODx.msg.alert(_('error'), r.message);
                                }, scope: this
                            }
                        }
                    });
                }, scope: this
            }]
        });
        dialog.show();
    },

    _translateResources: function (ids, translateLexicon) {
        var index = 0, wait = Ext.MessageBox.wait(_('localizator_translate_wait'), _('please_wait'));
        var next = function () {
            if (index >= ids.length) {
                if (!translateLexicon) {
                    wait.hide();
                    MODx.msg.confirm({title: _('localizator_translate'), text: _('localizator_clear_cache_confirm'), url: MODx.config.connector_url, params: {action: 'system/clearcache'}});
                    return;
                }
                wait.updateText(_('localizator_translate_wait_ext'));
                MODx.Ajax.request({url: this.config.url, params: {action: 'mgr/lexicon/translate'}, listeners: {success: {fn: function () {
                    wait.hide();
                    MODx.msg.confirm({title: _('localizator_translate'), text: _('localizator_clear_cache_confirm'), url: MODx.config.connector_url, params: {action: 'system/clearcache'}});
                }}, failure: {fn: function (r) {
                    wait.hide();
                    MODx.msg.alert(_('error'), r.message);
                }}}});
                return;
            }
            wait.updateText(_('localizator_translate_processed') + (index + 1) + ' / ' + ids.length);
            MODx.Ajax.request({url: this.config.url, params: {action: 'mgr/content/translatebatch', resource_id: ids[index]}, listeners: {success: {fn: function () { index++; next(); }}, failure: {fn: function (r) { wait.hide(); MODx.msg.alert(_('error'), r.message); }}}});
        }.bind(this);
        next();
    },

    onClick: function (e) {
        var elem = e.getTarget();
        if (elem.nodeName == 'BUTTON') {
            var row = this.getSelectionModel().getSelected();
            if (typeof(row) != 'undefined') {
                var action = elem.getAttribute('action');
                if (action == 'showMenu') {
                    var ri = this.getStore().find('id', row.id);
                    return this._showMenu(this, ri, e);
                }
                else if (typeof this[action] === 'function') {
                    this.menu.record = row.data;
                    return this[action](this, e);
                }
            }
        }
        return this.processEvent('click', e);
    },

    _getSelectedIds: function () {
        var ids = [];
        var selected = this.getSelectionModel().getSelections();

        for (var i in selected) {
            if (!selected.hasOwnProperty(i)) {
                continue;
            }
            ids.push(selected[i]['id']);
        }

        return ids;
    },

    _doSearch: function (tf) {
        this.getStore().baseParams.query = tf.getValue();
        this.getBottomToolbar().changePage(1);
    },

    _clearSearch: function () {
        this.getStore().baseParams.query = '';
        this.getBottomToolbar().changePage(1);
    },
});
Ext.reg('localizator-grid-language', localizator.grid.Language);


localizator.window.CreateLanguage = function (config) {
    config = config || {};
    if (!config.id) {
        config.id = 'localizator-language-window-create';
    }
    Ext.applyIf(config, {
        title: _('localizator_language_create'),
        width: 550,
        autoHeight: true,
        url: localizator.config.connector_url,
        action: 'mgr/language/create',
        fields: this.getFields(config),
        keys: [{
            key: Ext.EventObject.ENTER, shift: true, fn: function () {
                this.submit()
            }, scope: this
        }]
    });
    localizator.window.CreateLanguage.superclass.constructor.call(this, config);
};
Ext.extend(localizator.window.CreateLanguage, MODx.Window, {

	getFields: function(config) {
		return [{
			layout:'column',
			border:false,
			anchor: '100%',
			style: {margin: '0 0 20px 0'},
			items: [{
				layout: 'form',
				border:false,
				columnWidth: .5,
				items: [{
					xtype: 'textfield',
					fieldLabel: _('localizator_language_key'),
					name: 'key',
					id: config.id + '-key',
					anchor: '99%',
					allowBlank: false,
				}, {
					xtype: 'textfield',
					fieldLabel: _('localizator_language_http_host'),
					name: 'http_host',
					id: config.id + '-http_host',
					anchor: '99%',
					allowBlank: false,
				}],
			}, {
				layout: 'form',
				border:false,
				columnWidth: .5,
				items: [{
					xtype: 'textfield',
					fieldLabel: _('localizator_language_name'),
					name: 'name',
					id: config.id + '-name',
					anchor: '99%',
				}, {
					xtype: 'textfield',
					fieldLabel: _('localizator_language_cultureKey'),
					name: 'cultureKey',
					id: config.id + '-cultureKey',
					anchor: '99%',
				}],
			}]
		}, {
			xtype: 'textarea',
			fieldLabel: _('localizator_language_description'),
			name: 'description',
			id: config.id + '-description',
			anchor: '99%',
		}, {
			xtype: 'xcheckbox',
            boxLabel: _('localizator_active'),
            name: 'active',
            id: config.id + '-active',
            checked: true,
		}];
	},

});
Ext.reg('localizator-language-window-create', localizator.window.CreateLanguage);

localizator.window.UpdateLanguage = function (config) {
    config = config || {};
    if (!config.id) {
        config.id = 'localizator-language-window-update';
    }
    Ext.applyIf(config, {
        title: _('localizator_language_update'),
        width: 550,
        autoHeight: true,
        url: localizator.config.connector_url,
        action: 'mgr/language/update',
        fields: this.getFields(config),
        keys: [{
            key: Ext.EventObject.ENTER, shift: true, fn: function () {
                this.submit()
            }, scope: this
        }]
    });
    localizator.window.UpdateLanguage.superclass.constructor.call(this, config);
};
Ext.extend(localizator.window.UpdateLanguage, MODx.Window, {

	getFields: function(config) {
		return [{
            xtype: 'hidden',
            name: 'id',
            id: config.id + '-id',
        }, {
			layout:'column',
			border:false,
			anchor: '100%',
			style: {margin: '0 0 20px 0'},
			items: [{
				layout: 'form',
				border:false,
				columnWidth: .5,
				items: [{
					xtype: 'textfield',
					fieldLabel: _('localizator_language_key'),
					name: 'key',
					id: config.id + '-key',
					anchor: '99%',
					allowBlank: false,
				}, {
					xtype: 'textfield',
					fieldLabel: _('localizator_language_http_host'),
					name: 'http_host',
					id: config.id + '-http_host',
					anchor: '99%',
					allowBlank: false,
				}],
			}, {
				layout: 'form',
				border:false,
				columnWidth: .5,
				items: [{
					xtype: 'textfield',
					fieldLabel: _('localizator_language_name'),
					name: 'name',
					id: config.id + '-name',
					anchor: '99%',
				}, {
					xtype: 'textfield',
					fieldLabel: _('localizator_language_cultureKey'),
					name: 'cultureKey',
					id: config.id + '-cultureKey',
					anchor: '99%',
				}],
			}]
		}, {
			xtype: 'textarea',
			fieldLabel: _('localizator_language_description'),
			name: 'description',
			id: config.id + '-description',
			anchor: '99%',
		}, {
			xtype: 'xcheckbox',
            boxLabel: _('localizator_active'),
            name: 'active',
            id: config.id + '-active',
		}];
	},


});
Ext.reg('localizator-language-window-update', localizator.window.UpdateLanguage);

/*
Script: deluge-connections.js
    Contains all objects and functions related to the connection manager.

Copyright:
	(C) Damien Churchill 2009 <damoxc@gmail.com>
	This program is free software; you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation; either version 3, or (at your option)
	any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, write to:
		The Free Software Foundation, Inc.,
		51 Franklin Street, Fifth Floor
		Boston, MA  02110-1301, USA.

    In addition, as a special exception, the copyright holders give
    permission to link the code of portions of this program with the OpenSSL
    library.
    You must obey the GNU General Public License in all respects for all of
    the code used other than OpenSSL. If you modify file(s) with this
    exception, you may extend this exception to your version of the file(s),
    but you are not obligated to do so. If you do not wish to do so, delete
    this exception statement from your version. If you delete this exception
    statement from all source files in the program, then also delete it here.

*/

(function() {
	var hostRenderer = function(value, p, r) {
		return value + ':' + r.data['port']
	}
	
	Ext.deluge.AddConnectionWindow = Ext.extend(Ext.Window, {
		
		constructor: function(config) {
			config = Ext.apply({
				layout: 'fit',
				width: 300,
				height: 195,
				bodyStyle: 'padding: 10px 5px;',
				buttonAlign: 'right',
				closeAction: 'hide',
				closable: true,
				plain: true,
				title: _('Add Connection'),
				iconCls: 'x-deluge-add-window-icon'
			}, config);
			Ext.deluge.AddConnectionWindow.superclass.constructor.call(this, config);
		},
		
		initComponent: function() {
			Ext.deluge.AddConnectionWindow.superclass.initComponent.call(this);
			
			this.addEvents('hostadded');
			
			this.addButton(_('Close'), this.hide, this);
			this.addButton(_('Add'), this.onAdd, this);
			
			this.on('hide', this.onHide, this);
			
			this.form = this.add({
				xtype: 'form',
				defaultType: 'textfield',
				id: 'connectionAddForm',
				baseCls: 'x-plain',
				labelWidth: 55
			});
			
			this.hostField = this.form.add({
				fieldLabel: _('Host'),
				id: 'host',
				name: 'host',
				anchor: '100%',
				value: ''
			});
			
			this.portField = this.form.add({
				fieldLabel: _('Port'),
				id: 'port',
				xtype: 'uxspinner',
				ctCls: 'x-form-uxspinner',
				name: 'port',
				strategy: Ext.ux.form.Spinner.NumberStrategy(),
				value: '58846',
				anchor: '50%'
			});
			
			this.usernameField = this.form.add({
				fieldLabel: _('Username'),
				id: 'username',
				name: 'username',
				anchor: '100%',
				value: ''
			});
			
			this.passwordField = this.form.add({
				fieldLabel: _('Password'),
				anchor: '100%',
				id: '_password',
				name: '_password',
				inputType: 'password',
				value: ''
			});
		},
		
		onAdd: function() {
			var host = this.hostField.getValue();
			var port = this.portField.getValue();
			var username = this.usernameField.getValue();
			var password = this.passwordField.getValue();
			
			Deluge.Client.web.add_host(host, port, username, password, {
				success: function(result) {
					if (!result[0]) {
						Ext.MessageBox.show({
							title: _('Error'),
							msg: "Unable to add host: " + result[1],
							buttons: Ext.MessageBox.OK,
							modal: false,
							icon: Ext.MessageBox.ERROR,
							iconCls: 'x-deluge-icon-error'
						});
					} else {
						this.fireEvent('hostadded');
					}
					this.hide();
				},
				scope: this
			});
		},
		
		onHide: function() {
			this.form.getForm().reset();
		}
	});

	Ext.deluge.ConnectionManager = Ext.extend(Ext.Window, {
	
		layout: 'fit',
		width: 300,
		height: 220,
		bodyStyle: 'padding: 10px 5px;',
		buttonAlign: 'right',
		closeAction: 'hide',
		closable: true,
		plain: true,
		title: _('Connection Manager'),
		iconCls: 'x-deluge-connect-window-icon',
		
		initComponent: function() {
			Ext.deluge.ConnectionManager.superclass.initComponent.call(this);
			this.on({
				'hide': this.onHide,
				'show': this.onShow
			});
			Deluge.Events.on('login', this.onLogin, this);
			Deluge.Events.on('logout', this.onLogout, this);
			
			this.addButton(_('Close'), this.onClose, this);
			this.addButton(_('Connect'), this.onConnect, this);
			
			this.grid = this.add({
				xtype: 'grid',
				store: new Ext.data.SimpleStore({
					fields: [
						{name: 'status', mapping: 3},
						{name: 'host', mapping: 1},
						{name: 'port', mapping: 2},
						{name: 'version', mapping: 4}
					],
					id: 0
				}),
				columns: [{
					header: _('Status'),
					width: 65,
					sortable: true,
					renderer: fplain,
					dataIndex: 'status'
				}, {
					id:'host',
					header: _('Host'),
					width: 150,
					sortable: true,
					renderer: hostRenderer,
					dataIndex: 'host'
				}, {
					header: _('Version'),
					width: 75,
					sortable: true,
					renderer: fplain,
					dataIndex: 'version'
				}],
				stripeRows: true,
				selModel: new Ext.grid.RowSelectionModel({
					singleSelect: true,
					listeners: {
						'rowselect': {fn: this.onSelect, scope: this}
					}
				}),
				autoExpandColumn: 'host',
				deferredRender:false,
				autoScroll:true,
				margins: '0 0 0 0',
				bbar: new Ext.Toolbar({
					items: [
						{
							id: 'add',
							cls: 'x-btn-text-icon',
							text: _('Add'),
							icon: '/icons/add.png',
							handler: this.onAdd,
							scope: this
						}, {
							id: 'remove',
							cls: 'x-btn-text-icon',
							text: _('Remove'),
							icon: '/icons/remove.png',
							handler: this.onRemove,
							scope: this
						}, '->', {
							id: 'stop',
							cls: 'x-btn-text-icon',
							text: _('Stop Daemon'),
							icon: '/icons/error.png',
							handler: this.onStop,
							scope: this
						}
					]
				})
			});
		},
		
		disconnect: function() {
			Deluge.Events.fire('disconnect');
		},
		
		loadHosts: function() {
			Deluge.Client.web.get_hosts({
				success: this.onGetHosts,
				scope: this
			});
		},
		
		update: function(self) {
			self.grid.getStore().each(function(r) {
				Deluge.Client.web.get_host_status(r.id, {
					success: self.onGetHostStatus,
					scope: self
				});
			}, this);
		},
		
		onAdd: function(button, e) {
			if (!this.addWindow) {
				this.addWindow = new Ext.deluge.AddConnectionWindow();
				this.addWindow.on('hostadded', this.onHostAdded, this);
			}
			this.addWindow.show();
		},
		
		onHostAdded: function() {
			this.runCheck();
		},
		
		onClose: function(e) {
			if (this.running) window.clearInterval(this.running);
			this.hide();
		},
		
		onConnect: function(e) {
			var selected = this.grid.getSelectionModel().getSelected();
			if (!selected) return;
			
			if (selected.get('status') == _('Connected')) {
				Deluge.Client.web.disconnect({
					success: function(result) {
						this.update();
						Deluge.Events.fire('disconnect');
					},
					scope: this
				});
			} else {
				var id = selected.id;
				Deluge.Client.web.connect(id, {
					success: function(methods) {
						Deluge.Client.reloadMethods();
						Deluge.Client.on('connected', function(e) {
							Deluge.Events.fire('connect');
						}, this, {single: true});
					}
				});
				if (this.running) window.clearInterval(this.running);
				this.hide();
			}
		},
		
		onGetHosts: function(hosts) {
			var store = this.grid.getStore();
			Ext.each(hosts, function(host) {
				var record = store.getById(host[0]);
				if (!record) {
					store.loadData([host], true);
				}
				Deluge.Client.web.get_host_status(host[0], {
					success: this.onGetHostStatus,
					scope: this
				});
			}, this);
		},
		
		onGetHostStatus: function(host) {
			var record = this.grid.getStore().getById(host[0]);
			record.set('status', host[3])
			record.set('version', host[4])
			record.commit();
		},
		
		onLogin: function() {
			Deluge.Client.web.connected({
				success: function(connected) {
					if (connected) {
						Deluge.Events.fire('connect');
					} else {
						this.show();
					}
				},
				scope: this
			});
		},
		
		onLogout: function() {
			this.disconnect();
			if (!this.hidden && this.rendered) {
				this.hide();
			}
		},
		
		onRemove: function(button) {
			var connection = this.grid.getSelectionModel().getSelected();
			Deluge.Client.web.remove_host(connection.id, {
				success: function(result) {
					if (!result) {
						Ext.MessageBox.show({
							title: _('Error'),
							msg: result[1],
							buttons: Ext.MessageBox.OK,
							modal: false,
							icon: Ext.MessageBox.ERROR,
							iconCls: 'x-deluge-icon-error'
						});
					} else {
						this.grid.getStore().remove(connection);
					}
				},
				scope: this
			});
		},
		
		onSelect: function(selModel, rowIndex, record) {
			this.selectedRow = rowIndex;
			var button = this.buttons[1];
			if (record.get('status') == _('Connected')) {
				button.setText(_('Disconnect'));
			} else {
				button.setText(_('Connect'));
			}
		},
		
		onShow: function() {
			this.loadHosts();
			this.running = window.setInterval(this.update, 2000, this);
		},
		
		onStop: function(button, e) {
			var connection = this.grid.getSelectionModel().getSelected();
			Deluge.Client.web.stop_daemon(connection.id, {
				success: function(result) {
					if (!result[0]) {
						Ext.MessageBox.show({
							title: _('Error'),
							msg: result[1],
							buttons: Ext.MessageBox.OK,
							modal: false,
							icon: Ext.MessageBox.ERROR,
							iconCls: 'x-deluge-icon-error'
						});
					}
				}
			});
		}
	});
	Deluge.ConnectionManager = new Ext.deluge.ConnectionManager();
})();
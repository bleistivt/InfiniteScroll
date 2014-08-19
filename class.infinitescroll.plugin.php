<?php if (!defined('APPLICATION')) exit();
$PluginInfo['InfiniteScroll'] = array(
	'Name' => 'Infinite Scroll',
	'Description' => 'Infinite scrolling for discussions and discussion lists',
	'Version' => '0.2',
	'RequiredApplications' => array('Vanilla' => '2.1'),
	'SettingsPermission' => 'Garden.Settings.Manage',
	'SettingsUrl' => '/settings/infinitescroll',
	'MobileFriendly' => false,
	'Author' => 'Bleisitvt',
	'AuthorUrl' => 'http://bleistivt.net'
);

class InfiniteScroll extends Gdn_Plugin {
	
	public function Discussioncontroller_Render_Before($Sender) {
		if(!C('Plugins.InfiniteScroll.Discussion', true))
			return;
		$this->Ressources($Sender);
		//Add the reply button
		$Sender->AddAsset('Content', Anchor('Reply', '#Form_Comment',
			array(
				'id' => 'EndInfiniteScroll',
				'class' => 'Button BigButton Primary',
				'style' => 'position:fixed;bottom:0;right:10px;display:none;'
			))
		);
	}
	
	public function DiscussionsController_Render_Before($Sender) {
		if(C('Plugins.InfiniteScroll.DiscussionList', true))
			$this->Ressources($Sender);
	}
	
	public function CategoriesController_Render_Before($Sender) {
		if(C('Plugins.InfiniteScroll.DiscussionList', true))
			$this->Ressources($Sender);
	}
	
	//check user preferences and include js
	private function Ressources($Sender) {
		$Session = Gdn::Session();
		if ($Session->IsValid() && !$this->GetUserMeta($Session->UserID, 'Enable', true, true))
			return;
		$Sender->AddJsFile($this->GetResource('js/infinitescroll.js', false, false));
	}
	
	//preference checkbox
	public function ProfileController_EditMyAccountAfter_Handler($Sender) {
		$Session = Gdn::Session();
		$checked = ($this->GetUserMeta($Session->UserID, 'Enable', true, true))
			? array('checked' => 'checked')
			: array();
		echo Wrap(
			$Sender->Form->Checkbox('InfiniteScroll', 'Enable Infinite Scrolling', $checked),
			'li', array('class' => 'InfiniteScroll'));
	}
	
	public function UserModel_AfterSave_Handler($Sender) {
		$FormValues = $Sender->EventArguments['FormPostValues'];
		$UserID = val('UserID', $FormValues, 0);
		if(!is_int($UserID) || $UserID <= 0)
			return;
		$InfiniteScroll = val('InfiniteScroll', $FormValues, false);
		$this->SetUserMeta($UserID, 'Enable', $InfiniteScroll);
	}
	
	//configuration page
	public function SettingsController_InfiniteScroll_Create($Sender) {
		$Sender->Permission('Garden.Settings.Manage');
		$Sender->SetData('Title', T('InfiniteScroll').' '.T('Settings'));
		$Sender->AddSideMenu('dashboard/settings/plugins');
		$Conf = new ConfigurationModule($Sender);
		$Conf->Initialize(array(
			'Plugins.InfiniteScroll.Discussion' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Enable on discussions',
				'Default' => C('Plugins.InfiniteScroll.Discussion', true)
			),
			'Plugins.InfiniteScroll.DiscussionList' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Enable on discussion lists',
				'Default' => C('Plugins.InfiniteScroll.DiscussionList', true)
			)
		));
		$Conf->RenderAll();
	}

}

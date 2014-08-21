<?php if (!defined('APPLICATION')) exit();
$PluginInfo['InfiniteScroll'] = array(
	'Name' => 'Infinite Scroll',
	'Description' => 'Infinite scrolling for discussions and discussion lists',
	'Version' => '0.3',
	'RequiredApplications' => array('Vanilla' => '2.1'),
	'SettingsPermission' => 'Garden.Settings.Manage',
	'SettingsUrl' => '/settings/infinitescroll',
	'MobileFriendly' => false,
	'Author' => 'Bleisitvt',
	'AuthorUrl' => 'http://bleistivt.net'
);

class InfiniteScroll extends Gdn_Plugin {

	public function Discussioncontroller_Render_Before($Sender) {
		if(!(C('Plugins.InfiniteScroll.Discussion', true)
			&& $this->GetUserMeta($Session->UserID, 'Enable', true, true)))
			return;
		$this->Ressources($Sender);
		$Sender->AddDefinition('InfiniteScroll_InDiscussion', true);
		$Sender->AddDefinition('InfiniteScroll_FixedPanel', C('Plugins.InfiniteScroll.FixedPanel', false));
		$Sender->AddDefinition('InfiniteScroll_CountComments', $Sender->Discussion->CountComments);
		$Sender->AddDefinition('InfiniteScroll_Page', $Sender->Data['Page']);
		$Sender->AddDefinition('InfiniteScroll_Pages', CalculateNumberOfPages(
			$Sender->Discussion->CountComments, C('Vanilla.Comments.PerPage', 30)));
		$Sender->AddDefinition('InfiniteScroll_PerPage', intval(C('Vanilla.Comments.PerPage', 30)));
		$Sender->AddDefinition('InfiniteScroll_Url', $Sender->Data['Discussion']->Url);
		$Sender->AddDefinition('InfiniteScroll_ProgressBg',
			C('Plugins.InfiniteScroll.ProgressColor', '#38abe3'));
		//header
		if (C('Plugins.InfiniteScroll.Nav', true)) {
			$Controls = Anchor('&#x25b2;', '#', array('id' => 'InfScrollJTT'))
				.Wrap(' ', 'span', array('id' => 'NavIndex'))
				.Wrap('/'.$Sender->Discussion->CountComments, 'span', array('class' => 'small'))
				.Anchor('&#x25bc;', '#', array('id' => 'InfScrollJTB'));
			$Sender->AddAsset('Foot',Wrap($Controls, 'div', array('id' => 'InfScrollNav')));
		}
		//loading bar
		$Sender->AddAsset('Foot', Wrap('', 'span',
			array('id' => 'PageProgress', 'class' => 'Progress'))
		);
	}

	public function DiscussionsController_Render_Before($Sender) {
		if(C('Plugins.InfiniteScroll.DiscussionList', true))
			$this->Ressources($Sender);
	}

	public function CategoriesController_Render_Before($Sender) {
		if(!C('Plugins.InfiniteScroll.DiscussionList', true))
			return;
		$Sender->AddDefinition('InfiniteScroll_Url', $Sender->Category->Url);
		$this->Ressources($Sender);
	}

	public function DiscussionController_AfterCommentBody_Handler($Sender) {
		if(C('Plugins.InfiniteScroll.Discussion', true))
			echo Wrap('', 'span', array(
				'class' => 'ScrollMarker',
				'data-page' => $Sender->Data['Page']
			));
	}

	public function CategoriesController_AfterDiscussionTitle_Handler($Sender) {
		if(!C('Plugins.InfiniteScroll.DiscussionList', true))
			return;
		echo Wrap('', 'span', array(
			'class' => 'ScrollMarker',
			'data-page' => $Sender->Data['_Page']
		));
	}

	//check user preferences and include js
	private function Ressources($Sender) {
		$Session = Gdn::Session();
		if ($Session->IsValid() && !$this->GetUserMeta($Session->UserID, 'Enable', true, true))
			return;
		$Sender->AddJsFile($this->GetResource('js/nanobar.min.js', false, false));
		$Sender->AddJsFile($this->GetResource('js/infinitescroll.js', false, false));
		$Sender->AddCssFile($this->GetResource('design/infinitescroll.css', false, false));
		$pos = array ('top:0;right:0;', 'bottom:0;right:0;', 'top:0;left:0;', 'bottom:0;left:0;');
		$Position = '#InfScrollNav{'.$pos[C('Plugins.InfiniteScroll.NavPosition', '0')].'}';
		$Color = '#InfScrollNav,#InfScrollNav a,#InfScrollNav a:hover{color:'
			.htmlspecialchars(C('Plugins.InfiniteScroll.TextColor', 'rgba(0, 0, 0, 0.5)')).';}';
		$Sender->Head->AddString('<style type="text/css">'.$Position.$Color.'</style>');
	}

	//user preference checkbox
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
			),
			'Plugins.InfiniteScroll.Nav' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Show navigation',
				'Description' => T('InfiniteScroll.NavDesc', 'This adds a box with 2 Buttons to jump to the top and bottom of the page, so users don\'t have to scroll thorugh endless discussions.'),
				'Default' => C('Plugins.InfiniteScroll.Nav', true)
			),
			'Plugins.InfiniteScroll.NavPosition' => array(
				'Control' => 'dropdown',
				'Items' => array('top right', 'bottom right', 'top left', 'bottom left'),
				'LabelCode' => 'Navigation Position',
				'Default' => C('Plugins.InfiniteScroll.NavPosition', '0')
			),
			'Plugins.InfiniteScroll.TextColor' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Navigation Text Color',
				'Default' => C('Plugins.InfiniteScroll.TextColor', 'rgba(0, 0, 0, 0.5)'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.ProgressColor' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Progress Bar Color',
				'Description' => T('InfiniteScroll.ProgColorDesc', 'Define the color of the progressbar on the top to match your theme. Can be any CSS color, e.g. red, #ff0000, rgba(255, 0, 0, 1). If you don\'t want the bar to be visible, just type in "transparent".'),
				'Default' => C('Plugins.InfiniteScroll.ProgressColor', '#38abe3'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.FixedPanel' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Fixed Panel',
				'Description' => T('InfiniteScroll.FixedPanelDesc', 'This simply applies a "position: fixed;" to the Panel and makes some adjustments. This should be tested first, as it may require changes to your theme to work.'),
				'Default' => C('Plugins.InfiniteScroll.FixedPanel', false)
			),
		));
		$Conf->RenderAll();
	}

}

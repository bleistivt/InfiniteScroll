<?php if (!defined('APPLICATION')) exit();
$PluginInfo['InfiniteScroll'] = array(
	'Name' => 'Infinite Scroll',
	'Description' => 'Infinite scrolling for discussions and discussion lists',
	'Version' => '1.1.1',
	'RequiredApplications' => array('Vanilla' => '2.1.1'),
	'SettingsPermission' => 'Garden.Settings.Manage',
	'SettingsUrl' => '/settings/infinitescroll',
	'MobileFriendly' => false,
	'Author' => 'Bleisitvt',
	'AuthorUrl' => 'http://bleistivt.net'
);

class InfiniteScroll extends Gdn_Plugin {

	public function Discussioncontroller_Render_Before($Sender) {
		$Session = Gdn::Session();
		if (!C('Plugins.InfiniteScroll.Discussion', true)
			|| !$this->GetUserMeta($Session->UserID, 'Enable', true, true))
			return;
		
		$pageCount = CalculateNumberOfPages($Sender->Discussion->CountComments, C('Vanilla.Comments.PerPage', 30));
		
		$Sender->AddDefinition('InfiniteScroll_InDiscussion', true);
		$Sender->AddDefinition('InfiniteScroll_CountComments', $Sender->Discussion->CountComments + 1);
		$Sender->AddDefinition('InfiniteScroll_Page', $Sender->Data['Page']);
		$Sender->AddDefinition('InfiniteScroll_Pages', $pageCount);
		$Sender->AddDefinition('InfiniteScroll_PerPage', intval(C('Vanilla.Comments.PerPage', 30)));
		$Sender->AddDefinition('InfiniteScroll_Url', $Sender->Data['Discussion']->Url);
		$Sender->AddDefinition('InfiniteScroll_ProgressBg',
			C('Plugins.InfiniteScroll.ProgressColor', '#38abe3'));
		
		$this->Ressources($Sender);
		
		//navigation
		if (C('Plugins.InfiniteScroll.Nav', true)) {
			$Index = Wrap(
				Wrap(' ', 'span', array('id' => 'NavIndex'))
				.Wrap(
					'/'.($Sender->Discussion->CountComments + 1), 'span', array('class' => 'small')
				),
				'span', array('id' => 'InfScrollPageCount')
			);
			$JumpTo = Wrap(
				T('jump to page')
				.'<br><input type="number" maxlength="4" id="InfScrollJT" class="InputBox"> '
				.sprintf(T('of %s'), $pageCount),
				'form', array('id' => 'InfScrollJumpTo', 'class' => 'small')
			);
			$Controls =
				Anchor('&#x25b2;', '#', array('id' => 'InfScrollJTT'))
				.$Index.$JumpTo
				.Anchor('&#x25bc;', '#', array('id' => 'InfScrollJTB'));
			
			$Sender->AddAsset('Foot',Wrap($Controls, 'div', array('id' => 'InfScrollNav')));
		}
		
		//loading bar
		$Sender->AddAsset('Foot', Wrap('', 'span',
			array('id' => 'PageProgress', 'class' => 'Progress'))
		);
	}

	public function DiscussionsController_Render_Before($Sender) {
		if (C('Plugins.InfiniteScroll.DiscussionList', true) &&
			C('Vanilla.Discussions.Layout') != 'table')
			$this->Ressources($Sender);
	}

	public function CategoriesController_Render_Before($Sender) {
		if (!C('Plugins.InfiniteScroll.DiscussionList', true) ||
			C('Vanilla.Discussions.Layout') == 'table' ||
			!$Sender->Category)
			return;
		
		$pageCount = $Sender->Data['_Page'];
		$pageCount = ($pageCount) ? intval(filter_var($Sender->Data['_Page'], FILTER_SANITIZE_NUMBER_INT)) : 1;
		$discussionsCount = CalculateNumberOfPages($Sender->Data['Category']->CountDiscussions,
			C('Vanilla.Discussions.PerPage', 30));
		
		$Sender->AddDefinition('InfiniteScroll_Page', $pageCount);
		$Sender->AddDefinition('InfiniteScroll_Pages', $discussionsCount);
		$Sender->AddDefinition('InfiniteScroll_Url', $Sender->Category->Url);
		
		$this->Ressources($Sender);
	}
	
	public function Base_Render_Before($Sender) {
		$Session = Gdn::Session();
		//this adds the Ressources if only the sticky Panel is enabled
		if (!C('Plugins.InfiniteScroll.FixedPanel', false) ||
			!$this->GetUserMeta($Session->UserID, 'Enable', true, true) ||
			inSection(array('Profile', 'Dashboard')))
			return;
		
		$Sender->AddDefinition('InfiniteScroll_FixedPanel', true);
		$Sender->AddJsFile($this->GetResource('js/infinitescroll.js', false, false));
		$Sender->AddCssFile($this->GetResource('design/infinitescroll.css', false, false));
	}
	
	//check user preferences and include js
	private function Ressources($Sender) {
		$Session = Gdn::Session();
		if ($Session->IsValid() && !$this->GetUserMeta($Session->UserID, 'Enable', true, true))
			return;
		
		$Sender->AddDefinition('InfiniteScroll_Active', true);
		$Sender->AddDefinition('InfiniteScroll_HideHead', C('Plugins.InfiniteScroll.HideHead', true));
		$Sender->AddDefinition('InfiniteScroll_Treshold', intval(C('Plugins.InfiniteScroll.Treshold', 300)));
		
		$Sender->AddJsFile($this->GetResource('js/nanobar.min.js', false, false));
		$Sender->AddJsFile($this->GetResource('js/infinitescroll.js', false, false));
		$Sender->AddCssFile($this->GetResource('design/infinitescroll.css', false, false));
		
		$pos = array('top:0;right:0;', 'bottom:0;right:0;', 'top:0;left:0;', 'bottom:0;left:0;');
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
		if (!is_numeric($UserID) || $UserID <= 0)
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
				'LabelCode' => 'Enable on discussion lists (modern discussions layout only)',
				'Default' => C('Plugins.InfiniteScroll.DiscussionList', true)
			),
			'Plugins.InfiniteScroll.Treshold' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Treshold',
				'Description' => T('InfiniteScroll.TresholdDesc', 'Specify (in pixels) how close to the end of the content users have to scroll to trigger loading more.'),
				'Default' => C('Plugins.InfiniteScroll.Treshold', 300),
				'Options' => array('maxlength' => '8', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.Nav' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Show navigation',
				'Description' => T('InfiniteScroll.NavDesc', 'This adds a box with navigation elements so users don\'t have to manually scroll through endless discussions.'),
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
				'Description' => T('InfiniteScroll.TextColorDesc','Can be any CSS color, e.g. red, #ff0000, rgba(255, 0, 0, 1).'),
				'Default' => C('Plugins.InfiniteScroll.TextColor', 'rgba(0, 0, 0, 0.5)'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.ProgressColor' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Progress Bar Color',
				'Description' => T('InfiniteScroll.ProgColorDesc', 'Define the color of the progressbar on the top to match your theme. If you don\'t want the bar to be visible, just type in "transparent".'),
				'Default' => C('Plugins.InfiniteScroll.ProgressColor', '#38abe3'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.HideHead' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Hide Head Elements',
				'Description' => T('InfiniteScroll.HideHeadDesc', 'Hide the header and breadcrumbs when until Page 1 is reached. This simulates an "infinite" page better, but should be turned off, if you have changed your theme to have a fixed header, for example.'),
				'Default' => C('Plugins.InfiniteScroll.HideHead', true)
			),
			'Plugins.InfiniteScroll.FixedPanel' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Fixed Panel',
				'Description' => T('InfiniteScroll.FixedPanelDesc', 'This simply applies a "position: fixed;" to the Panel and makes some adjustments to work with the default theme. This should be tested first, as it may require changes to your theme to work.'),
				'Default' => C('Plugins.InfiniteScroll.FixedPanel', false)
			),
		));
		$Conf->RenderAll();
	}

}

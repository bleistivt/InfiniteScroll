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
		$Sender->AddDefinition('InfiniteScroll_InDiscussion', true);
		$Sender->AddDefinition('InfiniteScroll_Header', C('Plugins.InfiniteScroll.Header', true));
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
		if (C('Plugins.InfiniteScroll.Header', true)) {
			$Controls = Anchor('&#x25b2;', '#', array('id' => 'InfScrollJTT'))
				.Anchor('&#x25bc;', '#', array('id' => 'InfScrollJTB'));
			$Sender->AddAsset('Foot', Wrap(
				Wrap($Controls, 'div', array('class' => 'InfScrollControls')),
				'div', array('class' => 'InfScrollHeader')
			));
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
		$Sender->AddCssFile($this->GetResource('design/infinitescroll.css', false, false));;
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
			'Plugins.InfiniteScroll.Header' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Show a fixed header for easier navigation',
				'Description' => T('InfiniteScroll.HeaderDesc', 'When scrolling down, the discussion title and a progress bar to track how far you are into a discussion will be shown in a header. The appearance of it can be altered using the options below.'),
				'Default' => C('Plugins.InfiniteScroll.Header', true)
			),
			'Plugins.InfiniteScroll.ProgressColor' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Progress Bar Color',
				'Description' => T('InfiniteScroll.ProgColorDesc', 'Define the color of the progressbar on the top to match your theme. Can be any CSS color, e.g. red, #ff0000, rgba(255, 0, 0, 1)...'),
				'Default' => C('Plugins.InfiniteScroll.ProgressColor', '#38abe3'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.HeaderBg' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Header Background Color',
				'Default' => C('Plugins.InfiniteScroll.HeaderBg', '#fff'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.LineColor' => array(
				'Control' => 'textbox',
				'LabelCode' => 'Line and Shadow Color',
				'Default' => C('Plugins.InfiniteScroll.LineColor', '#ccc'),
				'Options' => array('maxlength' => '35', 'style' => 'width:180px;')
			),
			'Plugins.InfiniteScroll.FixedPanel' => array(
				'Control' => 'CheckBox',
				'LabelCode' => 'Fixiate the Panel',
				'Description' => T('InfiniteScroll.FixedPanelDesc', 'This simply applies a "position: fixed;" to the Panel and makes some adjusments. This should be tested first, as it may require changes to your theme to work.'),
				'Default' => C('Plugins.InfiniteScroll.FixedPanel', false)
			),
		));
		$Conf->RenderAll();
	}
	
	//Converts a (numeric) CSS color to rgba representation
	private function ToRgba($Color, $Opacity) {
		if ($Color == 'transparent')
			return 'transparent';
		$Color = str_ireplace(array('black', 'white'), array('#000', '#fff'), $Color);
		if (strpos($Color, 'rgba') !== false) {
			$A = floatval(substr($Color, strrpos($Color, ',') + 1));
			$Color = substr($Color, 0, strrpos($Color, ','));
			$Opacity = number_format((float)($Opacity * $A), 3, '.', '');
			return $Color.', '.$Opacity.')';
		} elseif (strpos($Color, 'rgb') !== false) {
			$Color = substr($Color, 0, strrpos($Color, ')'));
			$Color = str_ireplace('rgb', 'rgba', $Color);
			return $Color.', '.$Opacity.')';
		} elseif (strpos($Color, '#') !== false) {
			$regex = '/^\s*#([a-f0-9]{1,2})([a-f0-9]{1,2})([a-f0-9]{1,2})\s*$/i';
			preg_match($regex, $Color, $m);
			foreach ($m as &$col)
				$col = hexdec(substr($col.$col, 0, 2));
			return 'rgba('.$m[1].', '.$m[2].', '.$m[3].', '.$Opacity.')';
		} else {
			return $Color;
		}
	}

}

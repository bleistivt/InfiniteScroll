<?php if (!defined('APPLICATION')) exit();

$PluginInfo['InfiniteScroll'] = array(
    'Name' => 'Infinite Scroll',
    'Description' => 'This plugin hijacks the pagination, loads the next set of posts or discussions and updates the URL when the user reaches the end of the page.',
    'Version' => '2.0.3',
    'RequiredApplications' => array('Vanilla' => '2.1.1'),
    'SettingsPermission' => 'Garden.Settings.Manage',
    'SettingsUrl' => '/settings/infinitescroll',
    'MobileFriendly' => true,
    'Author' => 'Bleisitvt',
    'AuthorUrl' => 'http://bleistivt.net',
    'License' => 'GNU GPL2'
);

class InfiniteScrollPlugin extends Gdn_Plugin {

    public function DiscussionController_Render_Before($Sender) {
        $Session = Gdn::Session();
        if (!C('InfiniteScroll.Discussion', true) || !$Sender->Data('Page') || !$this->Enabled()) {
            return;
        }

        $CountComments = $Sender->Data('Discussion')->CountComments;
        $TotalPages = CalculateNumberOfPages($CountComments, C('Vanilla.Comments.PerPage', 30));

        $Sender->AddDefinition('InfiniteScroll.InDiscussion', true);
        $Sender->AddDefinition('InfiniteScroll.CountItems', $CountComments + 1);
        $Sender->AddDefinition('InfiniteScroll.Page', $Sender->Data('Page'));
        $Sender->AddDefinition('InfiniteScroll.TotalPages', $TotalPages);
        $Sender->AddDefinition('InfiniteScroll.PerPage', (int)C('Vanilla.Comments.PerPage', 30));
        $Sender->AddDefinition('InfiniteScroll.Url', $Sender->Data('Discussion')->Url);

        $this->Resources($Sender);
        $this->BuildNavigation($Sender, $CountComments + 1, $TotalPages);
    }


    public function DiscussionsController_Render_Before($Sender) {
        if (
            C('InfiniteScroll.DiscussionList', true) &&
            strtolower($Sender->RequestMethod) == 'index' &&
            $this->Enabled()
        ) {
            $this->PrepareDiscussionList($Sender);
            $Sender->AddDefinition('InfiniteScroll.Url', Url('discussions', true));
            $this->Resources($Sender);
        }
    }


    public function CategoriesController_Render_Before($Sender) {
        if (C('InfiniteScroll.DiscussionList', true) && $Sender->Category && $this->Enabled()) {
            $this->PrepareDiscussionList($Sender);
            $Sender->AddDefinition('InfiniteScroll.Url', CategoryUrl($Sender->Category, '', true));
            $this->Resources($Sender);
        }
    }


    // Builds the page navigation
    private function BuildNavigation($Sender, $CountItems, $TotalPages) {
        if ($CountItems <= C('InfiniteScroll.StartAt', 1)) {
            return;
        }

        $Index = Wrap(
            Wrap('?', 'span', array('class' => 'NavIndex'))
              .Wrap('/', 'span', array('class' => 'slash'))
              .Wrap($CountItems, 'span', array('class' => 'small')),
            'span',
            array('class' => 'PageCount')
        );
        $JumpTo = Wrap(
            T('jump to page')
              .'<br><input type="number" maxlength="4" id="InfScrollJT" class="InputBox" value="1">&nbsp;'
              .sprintf(T('of %s'), $TotalPages),
            'form', array('class' => 'JumpTo small')
        );
        $Controls =
            Anchor('&#x25b2;', '#', array('class' => 'JTT'))
              .$Index
              .$JumpTo
              .Anchor('&#x25bc;', '#', array('class' => 'JTB'));

        $Position = array('BottomRight', 'TopRight', 'BottomLeft', 'TopLeft');
        $Style = array('', ' StyleDisc');
        $Options = array(
            'id' => 'InfScrollNav',
            'class' => $Position[C('InfiniteScroll.NavPosition', 0)]
                       .$Style[C('InfiniteScroll.NavStyle', 0)]
        );

        $Sender->AddAsset('Foot', Wrap($Controls, 'div', $Options), 'InfiniteScrollNavigation');

        // Progress indicator
        if ($TotalPages > 1) {
            $Sender->AddAsset('Foot', Wrap('', 'span',
                array('id' => 'PageProgress', 'class' => 'Progress'))
            );
        }
    }


    // Add definitions for discussion lists.
    private function PrepareDiscussionList($Sender) {
        // Make the table view render just the inner content, similar to the modern view.
        if (C('Vanilla.Discussions.Layout') == 'table' && Gdn::Request()->Get('InnerList')) {
            $Sender->View = $this->GetView('inner_table.php');
        }

        $Page = (int)filter_var($Sender->Data('_Page'), FILTER_SANITIZE_NUMBER_INT);
        $Page = ($Page > 1) ? $Page : 1;

        $CountDiscussions = $Sender->Data('CountDiscussions');
        $TotalPages = CalculateNumberOfPages(
            $CountDiscussions, C('Vanilla.Discussions.PerPage', 30)
        );

        $Sender->AddDefinition('InfiniteScroll.CountItems', $CountDiscussions);
        $Sender->AddDefinition('InfiniteScroll.Page', $Page);
        $Sender->AddDefinition('InfiniteScroll.TotalPages', $TotalPages);
        $Sender->AddDefinition('InfiniteScroll.PerPage', (int)C('Vanilla.Discussions.PerPage', 30));

        $this->BuildNavigation($Sender, $CountDiscussions, $TotalPages);
    }


    // Check for mobile view and user preference
    private function Enabled() {
        $Session = Gdn::Session();
        return !(
            ($Session->IsValid() && !$this->GetUserMeta($Session->UserID, 'Enable', true, true)) ||
            (!C('InfiniteScroll.Mobile', false) && IsMobile())
        );
    }


    // Attach the resources.
    private function Resources($Sender) {
        if (!$this->Enabled()) {
            return;
        }

        $Sender->AddDefinition('InfiniteScroll.HideHead', C('InfiniteScroll.HideHead', true));
        $Sender->AddDefinition('InfiniteScroll.Treshold', (int)C('InfiniteScroll.Treshold', 200));
        $Sender->AddDefinition('InfiniteScroll.Hotkey', C('InfiniteScroll.Hotkey', 'j'));
        $Sender->AddDefinition('InfiniteScroll.NavStyle', (int)C('InfiniteScroll.NavStyle', 0));
        $Sender->AddDefinition('InfiniteScroll.ProgressBg', C('InfiniteScroll.ProgressColor', '#38abe3'));
        $Sender->AddDefinition('InfiniteScroll.Mobile', IsMobile());

        //$Sender->AddJsFile('nanobar.min.js', 'plugins/InfiniteScroll');
        //$Sender->AddJsFile('infinitescroll.js', 'plugins/InfiniteScroll');
        $Sender->AddJsFile('infinitescroll.min.js', 'plugins/InfiniteScroll');

        $Sender->AddCssFile('infinitescroll.css', 'plugins/InfiniteScroll');
    }


    // User preference checkbox for infinite scrolling on the "Edit Profile" page.
    public function ProfileController_EditMyAccountAfter_Handler($Sender) {
        $Session = Gdn::Session();
        $Checked = ($this->GetUserMeta($Session->UserID, 'Enable', true, true))
            ? array('checked' => 'checked')
            : array();
        echo Wrap(
            $Sender->Form->Checkbox('InfiniteScroll', 'Enable Infinite Scrolling', $Checked),
            'li',
            array('class' => 'InfiniteScroll')
        );
    }


    public function UserModel_AfterSave_Handler($Sender) {
        $FormValues = $Sender->EventArguments['FormPostValues'];
        $UserID = val('UserID', $FormValues, 0);
        $InfiniteScroll = val('InfiniteScroll', $FormValues, false);

        $this->SetUserMeta($UserID, 'Enable', $InfiniteScroll);
    }


    // Settings page
    public function SettingsController_InfiniteScroll_Create($Sender) {
        $Sender->Permission('Garden.Settings.Manage');
        $Sender->SetData('Title', T('InfiniteScroll Settings'));
        $Sender->AddSideMenu('dashboard/settings/plugins');
        $Sender->AddJsFile('settings.js', 'plugins/InfiniteScroll');

        $Conf = new ConfigurationModule($Sender);
        $Conf->Initialize(array(
            'InfiniteScroll.Discussion' => array(
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on discussions',
                'Default' => true
            ),
            'InfiniteScroll.DiscussionList' => array(
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on discussion lists',
                'Default' => true
            ),
            'InfiniteScroll.Mobile' => array(
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on mobile devices',
                'Default' => false
            ),
            'InfiniteScroll.Hotkey' => array(
                'Control' => 'textbox',
                'LabelCode' => 'Page Jump Hotkey',
                'Default' => 'j',
                'Options' => array('maxlength' => '1', 'style' => 'width:15px;')
            ),
            'InfiniteScroll.NavPosition' => array(
                'Control' => 'dropdown',
                'Items' => array('bottom right', 'top right', 'bottom left', 'top left'),
                'LabelCode' => 'Navigation Position'
            ),
            'InfiniteScroll.NavStyle' => array(
                'Control' => 'dropdown',
                'Items' => array('Basic', 'Discourse-inspired'),
                'LabelCode' => 'Navigation Style'
            ),
            'InfiniteScroll.ProgressColor' => array(
                'Control' => 'textbox',
                'LabelCode' => 'Progress Bar Color',
                'Description' => T('Can be any CSS color. If you don\'t want the bar to be visible, simply enter "transparent".'),
                'Default' => '#38abe3',
                'Options' => array('maxlength' => '35', 'style' => 'width:160px;')
            )
        ));
        $Conf->RenderAll();
    }

}

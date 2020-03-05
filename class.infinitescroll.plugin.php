<?php

class InfiniteScrollPlugin extends Gdn_Plugin {

    public function discussionController_render_before($sender) {
        if (!$sender->data('Page') || !$this->enabled('Discussion')) {
            return;
        }

        $countComments = $sender->data('Discussion')->CountComments;
        $totalPages = calculateNumberOfPages($countComments, c('Vanilla.Comments.PerPage', 30));

        $sender->addDefinition('InfiniteScroll.InDiscussion', true);
        $sender->addDefinition('InfiniteScroll.CountItems', $countComments + 1);
        $sender->addDefinition('InfiniteScroll.Page', $sender->data('Page'));
        $sender->addDefinition('InfiniteScroll.TotalPages', $totalPages);
        $sender->addDefinition('InfiniteScroll.PerPage', (int)c('Vanilla.Comments.PerPage', 30));
        $sender->addDefinition('InfiniteScroll.Url', $sender->data('Discussion')->Url);

        $this->resources($sender);
        $this->buildNavigation($sender, $countComments + 1, $totalPages);
    }


    public function discussionsController_render_before($sender) {
        if (strtolower($sender->RequestMethod) == 'index' && $this->enabled('DiscussionList')) {
            $this->prepareDiscussionList($sender);
            $sender->addDefinition('InfiniteScroll.Url', url('discussions', true));
            $this->resources($sender);
        }
    }


    public function categoriesController_render_before($sender) {
        if ($sender->Category && $this->enabled('DiscussionList')) {
            $this->prepareDiscussionList($sender);
            $sender->addDefinition('InfiniteScroll.Url', categoryUrl($sender->Category, '', true));
            $this->resources($sender);
        }
    }


    // Builds the page navigation
    private function buildNavigation($sender, $countItems, $totalPages) {
        if ($countItems <= c('InfiniteScroll.StartAt', 1)) {
            return;
        }

        $index = wrap(
            wrap('?', 'span', ['class' => 'NavIndex'])
              .wrap('/', 'span', ['class' => 'slash'])
              .wrap(
                c('InfiniteScroll.PageNumber') ?  $totalPages : $countItems,
                'span',
                ['class' => 'small']
            ),
            'span',
            ['class' => 'PageCount']
        );
        $jumpTo = wrap(
            t('jump to page')
              .'<br><input type="number" maxlength="4" id="InfScrollJT" class="InputBox" value="1">&nbsp;'
              .sprintf(t('of %s'), $totalPages),
            'form', ['class' => 'JumpTo small']
        );
        $controls =
            anchor('&#xf126;', '#', ['class' => 'JTT'])
              .$index
              .$jumpTo
              .anchor('&#xf11f;', '#', ['class' => 'JTB']);

        $position = ['BottomRight', 'TopRight', 'BottomLeft', 'TopLeft'];
        $style = ['', ' StyleDisc'];
        $options = [
            'id' => 'InfScrollNav',
            'class' => $position[c('InfiniteScroll.NavPosition', 0)]
                       .$style[c('InfiniteScroll.NavStyle', 0)]
        ];

        $sender->addAsset('Foot', wrap($controls, 'div', $options), 'InfiniteScrollNavigation');

        // Progress indicator
        if ($totalPages > 1) {
            $sender->addAsset('Foot', wrap('', 'span', [
                'id' => 'PageProgress',
                'class' => 'Progress'
            ]));
        }
    }


    // Add definitions for discussion lists.
    private function prepareDiscussionList($sender) {
        // Make the table view render just the inner content, similar to the modern view.
        if (c('Vanilla.Discussions.Layout') == 'table' && Gdn::request()->get('InnerList')) {
            $sender->View = $sender->fetchViewLocation('inner_table', '', 'plugins/InfiniteScroll');
        }

        $page = (int)filter_var($sender->data('_Page'), FILTER_SANITIZE_NUMBER_INT);
        $page = ($page > 1) ? $page : 1;

        $countDiscussions = $sender->data('CountDiscussions');
        $totalPages = calculateNumberOfPages(
            $countDiscussions, c('Vanilla.Discussions.PerPage', 30)
        );

        $sender->addDefinition('InfiniteScroll.CountItems', $countDiscussions);
        $sender->addDefinition('InfiniteScroll.Page', $page);
        $sender->addDefinition('InfiniteScroll.TotalPages', $totalPages);
        $sender->addDefinition('InfiniteScroll.PerPage', (int)c('Vanilla.Discussions.PerPage', 30));

        $this->buildNavigation($sender, $countDiscussions, $totalPages);
    }


    // Check for mobile view and user preference
    private function enabled($section = false) {
        if ($section && !c('InfiniteScroll.'.$section, true)) {
            return false;
        }
        $session = Gdn::session();
        return !(
            ($session->IsValid() && !$this->getUserMeta($session->UserID, 'Enable', true, true)) ||
            (!c('InfiniteScroll.Mobile', false) && isMobile())
        );
    }


    // Attach the resources.
    private function resources($sender) {
        $sender->addDefinition('InfiniteScroll.HideHead', c('InfiniteScroll.HideHead', true));
        $sender->addDefinition('InfiniteScroll.Treshold', (int)c('InfiniteScroll.Treshold', 200));
        $sender->addDefinition('InfiniteScroll.Hotkey', c('InfiniteScroll.Hotkey', 'j'));
        $sender->addDefinition('InfiniteScroll.PageNumber', c('InfiniteScroll.PageNumber'));
        $sender->addDefinition('InfiniteScroll.NavStyle', (int)c('InfiniteScroll.NavStyle', 0));
        $sender->addDefinition('InfiniteScroll.ProgressBg', c('InfiniteScroll.ProgressColor', '#38abe3'));
        $sender->addDefinition('InfiniteScroll.Mobile', isMobile());

        $sender->addJsFile('nanobar.min.js', 'plugins/InfiniteScroll');
        $sender->addJsFile('infinitescroll.js', 'plugins/InfiniteScroll');

        $sender->addCssFile('infinitescroll.css', 'plugins/InfiniteScroll');
    }


    // User preference checkbox for infinite scrolling on the "Edit Profile" page.
    public function profileController_editMyAccountAfter_handler($sender) {
        $sender->Form->setValue(
            'InfiniteScroll',
            $this->getUserMeta($sender->User->UserID, 'Enable', true, true)
        );
        echo wrap(
            $sender->Form->checkbox('InfiniteScroll', 'Enable Infinite Scrolling'),
            'li',
            ['class' => 'InfiniteScroll']
        );
    }


    public function userModel_afterSave_handler($sender, $args) {
        if (array_key_exists('InfiniteScroll', $args['FormPostValues'])) {
            $this->setUserMeta(
                val('UserID', $args['FormPostValues']),
                'Enable',
                val('InfiniteScroll', $args['FormPostValues'], false)
            );
        }
    }


    // Settings page
    public function settingsController_infiniteScroll_create($sender) {
        $sender->permission('Garden.Settings.Manage');
        $sender->title(t('InfiniteScroll Settings'));

        $conf = new ConfigurationModule($sender);
        $conf->initialize([
            'InfiniteScroll.Discussion' => [
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on discussions',
                'Default' => true
            ],
            'InfiniteScroll.DiscussionList' => [
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on discussion lists',
                'Default' => true
            ],
            'InfiniteScroll.Mobile' => [
                'Control' => 'CheckBox',
                'LabelCode' => 'Enable on mobile devices',
                'Default' => false
            ],
            'InfiniteScroll.Hotkey' => [
                'Control' => 'textbox',
                'LabelCode' => 'Page Jump Hotkey',
                'Default' => 'j',
                'Options' => ['maxlength' => '1', 'style' => 'width:30px;']
            ],
            'InfiniteScroll.NavPosition' => [
                'Control' => 'dropdown',
                'Items' => ['bottom right', 'top right', 'bottom left', 'top left'],
                'LabelCode' => 'Navigation Position'
            ],
            'InfiniteScroll.NavStyle' => [
                'Control' => 'dropdown',
                'Items' => ['Basic', 'Discourse-inspired'],
                'LabelCode' => 'Navigation Style'
            ],
            'InfiniteScroll.ProgressColor' => [
                'Control' => 'color',
                'LabelCode' => 'Progress Bar Color',
                'Description' => t('Can be any CSS color. If you don\'t want the bar to be visible, simply enter "transparent".'),
                'Default' => '#38abe3'
            ]
        ]);
        $conf->renderAll();
    }

}

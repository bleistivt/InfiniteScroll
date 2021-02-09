<?php if (!defined('APPLICATION')) exit();

$session = Gdn::session();
include_once $this->fetchViewLocation('helper_functions', 'discussions', 'vanilla');
include_once $this->fetchViewLocation('table_functions', 'discussions', 'vanilla');

$alt = '';
if (property_exists($this, 'AnnounceData') && is_object($this->AnnounceData)) {
    foreach ($this->AnnounceData->result() as $discussion) {
        $alt = $alt === ' Alt' ? '' : ' Alt';
        writeDiscussionRow($discussion, $this, $session, $alt);
    }
}

$alt = '';
foreach ($this->DiscussionData->result() as $discussion) {
    $alt = $alt === ' Alt' ? '' : ' Alt';
    writeDiscussionRow($discussion, $this, $session, $alt);
}

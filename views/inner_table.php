<?php if (!defined('APPLICATION')) exit();

$Session = Gdn::Session();
include_once $this->FetchViewLocation('helper_functions', 'discussions', 'vanilla');
include_once $this->FetchViewLocation('table_functions', 'discussions', 'vanilla');

$Alt = '';
if (property_exists($this, 'AnnounceData') && is_object($this->AnnounceData)) {
    foreach ($this->AnnounceData->Result() as $Discussion) {
        $Alt = $Alt == ' Alt' ? '' : ' Alt';
        WriteDiscussionRow($Discussion, $this, $Session, $Alt);
    }
}

$Alt = '';
foreach ($this->DiscussionData->Result() as $Discussion) {
    $Alt = $Alt == ' Alt' ? '' : ' Alt';
    WriteDiscussionRow($Discussion, $this, $Session, $Alt);
}

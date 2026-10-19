import test from 'node:test';
import assert from 'node:assert/strict';
import { requestStatus,requestPriority,actionableQuote,validateMessage,legacyRequestNote } from './lifecycle.ts';
test('legacy offers remain reviewable without describing unconfirmed offers as bookings',()=>{
 for(const status of ['sent','countered','accepted'])assert.equal(actionableQuote(status),true);
 assert.equal(requestStatus('accepted',false),'Offer ready to confirm');assert.equal(requestStatus('accepted',true),'Booked');
 assert.equal(requestStatus('countered'),'Updated quote');assert.equal(actionableQuote('sent',true),false);
});
test('customer and vendor inboxes prioritize decisions and replies over waiting and history',()=>{
 assert.equal(requestPriority('sent',false,false),0);assert.equal(requestPriority('pending',false,false,true),0);
 assert.equal(requestPriority('pending',false,false),1);assert.equal(requestPriority('accepted',true,false),2);
 assert.equal(requestPriority('cancelled',false,true),3);assert.equal(requestStatus('pending',false,true),'New inquiry');
});
test('message validation trims edges while preserving line breaks and plain-text HTML',()=>{
 assert.equal(validateMessage('  first\n<script>text</script>  '),'first\n<script>text</script>');
 assert.throws(()=>validateMessage(' \n '));assert.throws(()=>validateMessage('x'.repeat(4001)));
 assert.equal(validateMessage('x'.repeat(4000)).length,4000);
});
test('legacy generated context is separated from genuine new customer notes',()=>{
 assert.equal(legacyRequestNote('Wedding\nDate: October\nLocation: Glendale\nGuests: 100\nReception: 18:00'),true);
 assert.equal(legacyRequestNote('Can you include setup?'),false);assert.equal(legacyRequestNote(null),false);
});

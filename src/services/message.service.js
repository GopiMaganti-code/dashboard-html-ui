;(function(global){
  var MESSAGES_THREADS = [
    { id:'c1', name:'Angela Crawford', initials:'AC', color:'#EEEDFE', textColor:'#534AB7', preview:'Sounds good — let me know when you launch.', time:'6:23 PM', online:true, messages:[
      {dir:'recv', text:'Hi John, thanks for the connection request.', time:'6:18 PM'},
      {dir:'sent', text:'Hi Angela — happy to connect. Loved your post on outbound.', time:'6:19 PM'},
      {dir:'recv', text:'Sounds good — let me know when you launch.', time:'6:23 PM'},
    ]},
    { id:'c2', name:'Jose Luis Toma', initials:'JL', color:'#EAF3DE', textColor:'#3B6D11', preview:'Perfect, talk next week.', time:'5:29 PM', online:false, lastSeen:'Active 3h ago', messages:[
      {dir:'sent', text:'Quick follow-up on the campaign sequence.', time:'5:12 PM'},
      {dir:'recv', text:'Yes, we can schedule a short call.', time:'5:20 PM'},
      {dir:'sent', text:'Tuesday 4pm your time works for me.', time:'5:25 PM'},
      {dir:'recv', text:'Perfect, talk next week.', time:'5:29 PM'},
    ]},
    { id:'c3', name:'Robin Organticos', initials:'RO', color:'#E6F1FB', textColor:'#185FA5', preview:'Noted — I will review the deck.', time:'5:14 PM', online:true, messages:[
      {dir:'recv', text:'Can you share the one-pager?', time:'5:10 PM'},
      {dir:'sent', text:'Sent via link — let me know if it opens.', time:'5:11 PM'},
      {dir:'recv', text:'Noted — I will review the deck.', time:'5:14 PM'},
    ]},
    { id:'c4', name:'Maria Fernandez', initials:'MF', color:'#E1F5EE', textColor:'#0F6E56', preview:'Thanks! Appreciate the intro.', time:'4:45 PM', online:false, lastSeen:'Active yesterday', messages:[
      {dir:'recv', text:'Introduced you to Priya on email.', time:'4:40 PM'},
      {dir:'sent', text:'Thanks! Appreciate the intro.', time:'4:45 PM'},
    ]},
    { id:'c5', name:'Jonathan Capucci', initials:'JC', color:'#FCEBEB', textColor:'#A32D2D', preview:'Will get back tomorrow.', time:'5:13 PM', online:false, lastSeen:'Active 1h ago', messages:[
      {dir:'sent', text:'Following up on the message thread.', time:'5:05 PM'},
      {dir:'recv', text:'Will get back tomorrow.', time:'5:13 PM'},
    ]},
    { id:'c6', name:'Clara Nguyen', initials:'CN', color:'#E1F5EE', textColor:'#0F6E56', preview:'See you at the webinar.', time:'4:40 PM', online:true, messages:[
      {dir:'recv', text:'Are you joining the LinkedIn webinar?', time:'4:35 PM'},
      {dir:'sent', text:'Yes — registered this morning.', time:'4:38 PM'},
      {dir:'recv', text:'See you at the webinar.', time:'4:40 PM'},
    ]},
    { id:'c7', name:'Michael Torres', initials:'MT', color:'#EAF3DE', textColor:'#3B6D11', preview:'Queued follow-up for Monday.', time:'10:50 PM', online:false, lastSeen:'Active 2 days ago', messages:[
      {dir:'sent', text:'Campaign note: pacing looks healthy.', time:'10:45 PM'},
      {dir:'recv', text:'Queued follow-up for Monday.', time:'10:50 PM'},
    ]},
    { id:'c8', name:'Shanti Choi-Ihre', initials:'SC', color:'#FAEEDA', textColor:'#854F0B', preview:'👍', time:'4:30 PM', online:false, lastSeen:'Active 4h ago', messages:[
      {dir:'recv', text:'Thanks for the like on my post!', time:'4:28 PM'},
      {dir:'sent', text:'Great content — keep them coming.', time:'4:29 PM'},
      {dir:'recv', text:'👍', time:'4:30 PM'},
    ]},
  ];

  function getMessagesThreads(){
    return MESSAGES_THREADS;
  }

  function firstNameFromLead(name){
    var p = (name || '').split(/\s+/);
    return p[0] || 'there';
  }

  function buildCampaignInboxThreads(rows){
    var replySnippets = [
      'Thanks for the note — happy to chat. How does Thursday look?',
      'Appreciate you reaching out. Send over a couple times that work?',
      'Sounds good on my end. Let\'s find 15 minutes next week.',
      'Thanks — I\'ll review and follow up shortly.'
    ];
    return rows.map(function(r, i){
      var fn = firstNameFromLead(r.name);
      var sentText = 'Hi ' + fn + ' — quick note from our campaign: thanks for connecting. Open to a brief chat this week?';
      var replied = (r.status || '').toLowerCase() === 'replied';
      var messages;
      if (replied){
        messages = [
          { dir: 'sent', text: sentText, time: r.time },
          { dir: 'recv', text: replySnippets[i % replySnippets.length], time: r.time }
        ];
      } else {
        messages = [{ dir: 'sent', text: sentText, time: r.time }];
      }
      var last = messages[messages.length - 1].text;
      var preview = last.length > 52 ? last.slice(0, 49) + '…' : last;
      return {
        id: 'cms-' + i,
        leadRow: r,
        name: r.name,
        initials: r.initials,
        color: r.color,
        textColor: r.textColor,
        url: r.url,
        replyStatus: r.status,
        time: r.time,
        preview: preview,
        messages: messages
      };
    });
  }

  global.AppMessageService = {
    getMessagesThreads: getMessagesThreads,
    buildCampaignInboxThreads: buildCampaignInboxThreads
  };
})(window);

//function called upon by slack when the /add_dashboard command was initiated
function doPost(request) {
  removeAddDeadline();

  Logger.log(request.callback_id);
  var sheets = SpreadsheetApp.openById(DASHBOARD_ID);
  var confSheet = sheets.getSheetByName("contact information");
  
  
  if(request.parameters['command'] =="/add_deadline"){
    
    if(request.parameters['text']!=null && request.parameters['text'] !=""){
      //starts the adding of a deadline with a delay - needed to avoid the slack timeout error
      var params =request.parameters;
      var scriptProperties = PropertiesService.getScriptProperties();
      scriptProperties.setProperty('params', JSON.stringify(params));
      ScriptApp.newTrigger("addDeadline")
      .timeBased()
      .after(2)
      .create();
    }else{
      sendCreateDeadline(request.parameters['trigger_id'],request.parameters['channel_id']);
    }
  }
  
  if(JSON.stringify(request).indexOf("deadline_add") != -1){
    
    var scriptProperties = PropertiesService.getScriptProperties();
    
    scriptProperties.setProperty('params', JSON.stringify(request.parameters.payload) );
    
    ScriptApp.newTrigger("addDeadline")
    .timeBased()
    .after(2)
    .create();
    return ContentService.createTextOutput("");
  }
  return ContentService.createTextOutput("The Deadline is being added...." );
  
  
}

function doGet(request){
  Logger.log("hello");
  return ContentService.createTextOutput("I am alive");
}



//adds the given deadline to the dashboard
function addDeadline(){
  var sheets = SpreadsheetApp.openById(DASHBOARD_ID);
  
  var confSheet = sheets.getSheetByName("contact information");
  var contrlSheet= sheets.getSheetByName("Control Panel")
  var scriptproperties = PropertiesService.getScriptProperties();
  var params = JSON.parse(scriptproperties.getProperty('params'));

  var channel = contrlSheet.getRange('E5').getValue();
  //add_dashboard <name> <name> <name> <30/10/2018> <dashboard>
  
  // PROCESS TEXT FROM MESSAGE
  if(params.text!=null ){
    var textRaw = String(params.text);
    var text = textRaw.split(/\s*>\s*/g);
    
    // FALL BACK TO DEFAULT TEXT IF NO UPDATE PROVIDED
    var deadline   = text[0].replace('<','') || "No name Specified";
    var reference = text[1].replace('<','') || "No update provided";
    var contactPerson     = text[2].replace('<','') || "No update provided";
    var date=text[3].replace('<','');
    var dashboard=text[4].replace('<','');
    var row=  searchDashboardRow(dashboard);
  }else{
  
  
  if(JSON.parse(params).submission!=null){
    params= JSON.parse(params)
    Logger.log(params);
    var deadline   = params.submission.dl_name || "No name Specified";
    var reference = params.submission.dl_ref || "No update provided";
    var contactPerson     = params.submission.dl_res || "No update provided";
    var date= params.submission.dl_date ;
    
    var row = contrlSheet.getRange(params.submission.dashboard || 2, 1,1,contrlSheet.getLastColumn()).getValues()[0];
    var dashboard = row[0];
    Logger.log(dashboard)
    
    contactPerson = getSlackuser(contactPerson);
    contactPerson =  contactPerson.profile.display_name;
    Logger.clear();
    Logger.log(contactPerson);
  }
  }
  var sections = row[2].split(',').length;
  Logger.log("split:" + sections);
  
  var splitdate = date.split('/');
  var day = splitdate[0] ;
  var month = splitdate[1] ;
  var year = splitdate[2];
  
  var dashboardSheet = sheets.getSheetByName(dashboard);
  var formulas = dashboardSheet.getRange(6, 2).getFormulasR1C1();
  var column = dashboardSheet.getRange('A1').getValue() + 2;
    dashboardSheet.insertColumnAfter(column -1);
  // RECORD TIMESTAMP AND USER NAME IN SPREADSHEET
      var design = dashboardSheet.getRange('B1');
  design.copyTo(dashboardSheet.getRange(1,column), {formatOnly: true});
  
    var design = dashboardSheet.getRange('B2');
  design.copyTo(dashboardSheet.getRange(2,column), {formatOnly: true});

  var design = dashboardSheet.getRange('B3');
  design.copyTo(dashboardSheet.getRange(3,column), {formatOnly: true});
  
  var design = dashboardSheet.getRange('B4');
  design.copyTo(dashboardSheet.getRange(4,column), {formatOnly: true});

  var design = dashboardSheet.getRange('B5');
  design.copyTo(dashboardSheet.getRange(5,column), {formatOnly: true});

  var design = dashboardSheet.getRange('B6');
  design.copyTo(dashboardSheet.getRange(6,column), {formatOnly: true});
  

  dashboardSheet.getRange(2, column).setValue(deadline);
  dashboardSheet.getRange(3, column).setValue(reference);
  dashboardSheet.getRange(4, column).setValue(contactPerson);
  dashboardSheet.getRange(5, column).setValue(year + "-" + month + "-" + day);
  dashboardSheet.getRange(6, column).setFormulasR1C1(formulas);
  

  
  
  
  for ( var h=0;h< sections;h++){
    
    dashboardSheet.getRange(h+8, column).setDataValidation(dashboardSheet.getRange('B8').getDataValidation());
    dashboardSheet.getRange(h+8, column).setValue("");
    
  }
  confSheet.getRange('F41').setValue(params.user);
  confSheet.getRange('F42').setValue(params);
  var usr = params.user_name || params.user.name;
  
  postResponse(channel, deadline, usr, date,row,dashboard);
  

}


//sends a response to a chosen channel when a deadline has been added to the dashboard
function postResponse(channel, deadline, userName, date,row,dashboard) {
  var url = row[3];
  Logger.log(url);
  var link=row[7];
  var payload = {
    "channel": "#" + channel,
    // "channel" : "@jens",
    "username": "James",
    "icon_emoji": ":white_check_mark:",
    "link_names": 1,
    "attachments":[
    {
    "fallback": "This is an update from a Slackbot integrated into your organization. Your client chose not to show the attachment.",
    "pretext": "*" + userName + "* added a deadline to the *" +  dashboard +" dashboard*, check it out here " + link ,
    "mrkdwn_in": ["pretext"],
    "color": "#D00000",
    "fields":[
    {
    "title":"deadline",
    "value": deadline,
    "short":false
  },
      {
        "title":"date",
          "value": date,
            "short": false
      }
  ]
}
]
};


var options = {
  'method': 'post',
  'payload': JSON.stringify(payload)
};

var response = UrlFetchApp.fetch(url,options);
}
//sends a response to a chosen channel when a deadline has been added to the dashboard
function postText(channel, message,url) {
  
  var payload = {
    "channel": "#" + channel,
    // "channel" : "@jens",
    "username": "James",
    "icon_emoji": ":white_check_mark:",
    "link_names": 1,
    "text": message
};

var options = {
  'method': 'post',
  'payload': JSON.stringify(payload)
};

var response = UrlFetchApp.fetch(url,options);
}

function logger(){
   var scriptproperties = PropertiesService.getScriptProperties();
var request = scriptproperties.getProperty('request');
Logger.log("FROM HERE;" + request);
  
  Logger.log("JSON STRINGY:" + request.indexOf("deadline_add"));
  Logger.log("JSON Stringy:" + JSON.stringify(request).indexOf("deadline_add"));
//  Logger.log("JSON Stringy:" + JSON.parse(request).indexOf("deadline_add"));
}
function createDeadline() {
  var payload = {
    "text": "Would you like to create a deadline?",
    "attachments": [
      {
        "text": "",
        "fallback": "You are unable to choose a game",
        "callback_id": "create_deadline",
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
          {
            "name": "option",
            "text": "Yes",
            "type": "button",
            "value": "Yes"
          },
          {
            "name": "option",
            "text": "No",
            "type": "button",
            "value": "No"
          }
          
        ]
      }
    ]
  };
  var options = {
    'method': 'post',
    'payload': JSON.stringify(payload)
  };
  var slackWebookURL = "https://hooks.slack.com/services/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"
  var response = UrlFetchApp.fetch(slackWebookURL, options);
}

function sendCreateDeadline(trigger_id,channel){
  var options = getDashboardNamesDropdown();
  var payload = {token:SLACKBOT_TOKEN, Authorization: SLACKBOT_TOKEN, channel:channel,icon_emoji: ":robot_face:",username: "James",  dialog : JSON.stringify({
    "callback_id": "deadline_add",
    "title": "Create a deadline",
    "submit_label": "Create",
    "elements": [
      {
        "type": "text",
        "label": "Deadline Name",
        "name": "dl_name"
      },
      {
        "type": "text",
        "label": "Reference",
        "name": "dl_ref",
        "optional":true
      },
      {
        "type": "select",
        "label": "Responsible Person",
        "name": "dl_res",
        "data_source": "users"
      },{
        "type": "text",
        "label": "Deadline Date (DD/MM/YYYY)",
        "name": "dl_date"
      }
      ,{
        "label": "Dashboard",
        "type": "select",
        "name": "dashboard",
        "options": options
      }
    ]
  }),trigger_id:trigger_id.toString()};
  
  UrlFetchApp.fetch('https://slack.com/api/dialog.open', {method: 'post', payload:payload});
  
}


function getDashboardNamesDropdown(){
  var sheets = SpreadsheetApp.openById(DASHBOARD_ID);
  var confSheet = sheets.getSheetByName("Control Panel");
  var options = [];  
  var range = confSheet.getRange(1,1,confSheet.getLastRow(), 1);
  var values = range.getValues();
  Logger.log(values);
  for (var i=1; i< values.length;i++){
    var element = {
      "label": values[i][0],
      "value": i +1
    };
    options.push(element);
    Logger.log(element);
  }
  Logger.log(options);
  return options;
}
function removeAddDeadline (){
var triggers = ScriptApp.getProjectTriggers();
for ( var i in triggers ) {
  if( triggers[i].getHandlerFunction() == "addDeadline" || triggers[i].getHandlerFunction() == "logger"){
  ScriptApp.deleteTrigger(triggers[i]);
  }
  
}
  
}
function searchDashboardRow(dashboardname){
  var sheets = SpreadsheetApp.openById(DASHBOARD_ID);
  var confSheet = sheets.getSheetByName("Control Panel");
  
  var range = confSheet.getRange(1,1,confSheet.getLastRow(), 1);
  var values = range.getValues();
  
  for (var i=1; i< values.length;i++){
    
    if(values[i][0]== dashboardname){
      return confSheet.getRange(i+1, 1,1,confSheet.getLastColumn()).getValues()[0];
      
    }
    
  }
}


function getSlackuser(user){
 var payload = {token:SLACKBOT_TOKEN, Authorization: SLACKBOT_TOKEN, user: user,username: "James"};
 var user =  UrlFetchApp.fetch('https://slack.com/api/users.info', {method: 'get', payload:payload});
 user = JSON.parse(user);
 Logger.log(user.user);
 
 return user.user;
}

function addPresidentDeadline(param){
var scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('params', param);
  addDeadline();
}

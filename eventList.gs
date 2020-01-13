//function in development for open call list generation
function makeEvents(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var openCallSheet = ss.getSheetByName("Open calls");
  var today = new Date();
  var yesterday = new Date();
  yesterday.setDate(today.getDate()-6);
  yesterday= Utilities.formatDate(yesterday, "CET", "MM/dd/yyyy");
  var tomorrow = new Date();
  tomorrow.setDate(today.getDate()+1);
   tomorrow= Utilities.formatDate(tomorrow, "CET", "MM/dd/yyyy")
  Logger.log(yesterday);
  var threads = GmailApp.search('label:international-international-events  OR label:international-open-calls after:' +  yesterday + ' before:' + tomorrow);  
  for(var i = 0; i<threads.length;i++){
    var messages= threads[i].getMessages();
    
    
    
    
    if(!eventExists(messages[0].getSubject())){
      
      var pdf = GmailUtils.messageToPdf(threads[i]);
      var id = DriveApp.createFile(pdf).getId();
      var file = DriveApp.getFileById(id);
      var subject=messages[0].getSubject();
      var type =findType(messages[0].getSubject());
      var country =findCountry(messages[0].getSubject(),messages[0].getPlainBody());
      DriveApp.getFolderById(DRIVE_FOLDER_ID).addFile(file);
      DriveApp.getRootFolder().removeFile(file);
      file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW)
      openCallSheet.appendRow(['=HYPERLINK("' + file.getUrl() + '", "'+ subject + '")',type,country,new Date()]);
    
    postEvent('testwebhooks','Your international future',subject ,country,type,file.getUrl())
    }
  }
  openCallSheet.sort(4,false);
}

function findType(subject){
  if(subject.indexOf('NP') > -1 || subject.toLowerCase().indexOf('national platform') > -1){
    return "NP";
  }
  if(subject.toLowerCase().indexOf('invitation') > -1){
    return "International Event";
  }
  if(subject.toLowerCase().indexOf('open call') > -1 ||subject.toLowerCase().indexOf('call for') > -1 ){
    return "Open Call";
  }
  
  return "Open Call";
  
}

function eventExists(subject){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var openCallSheet = ss.getSheetByName("Open Calls");
  var data = openCallSheet.getDataRange().getValues();
  for(var i = 0; i<data.length;i++){
    if(data[i][0] == subject){ //[1] because column B
      Logger.log((i+1))
      return true;
    }
  }
  return false;
  
}

function cleanEvents(){
  cleanDrive();
  cleanList();
  
}

function cleanDrive(){
  var folderID=DRIVE_FOLDER_ID;
  var files = DriveApp.getFolderById(folderID).getFiles();
  while (files.hasNext()) {
    var file = files.next();
    Logger.log('Deleting file "%s"',
               file.getName());
    // Delete File
    DriveApp.getFolderById(folderID).removeFile(file);
  }
}

function cleanList(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var openCallSheet = ss.getSheetByName("Open calls");
  
  var start, end;
  
  start = 2;
  end = openCallSheet.getLastRow() - 1;//Number of last row with content
  //blank rows after last row with content will not be deleted
  
  openCallSheet.deleteRows(start, end);
}

function postEvent(channel,userName,subject,country,type,file){

var reference = type + " " + country;
var payload = {
    "channel": "#" + channel,
    "username": "ESN Austria Dasboard",
    "icon_emoji": ":white_check_mark:",
    "link_names": 1,
    "attachments":[
       {
          "fallback": "This is an update from a Slackbot integrated into your organization. Your client chose not to show the attachment.",
          "pretext": "*" + userName + "* added a new opportunity",
          "mrkdwn_in": ["pretext"],
          "color": "#D00000",
          "fields":[
         {
                "title":"subject",
                "value": subject,
                "short":false
             },
             {
                "title":"what?",
                "value": reference,
                "short":false
             },
             {
                "title":"Email",
                "value": file,
                "short":false
             }
             
          ]
       }
    ]
  };

  var url = SLACK_WEBHOOK_POSTEVENT;
  var options = {
    'method': 'post',
    'payload': JSON.stringify(payload)
  };

  var response = UrlFetchApp.fetch(url,options);
}
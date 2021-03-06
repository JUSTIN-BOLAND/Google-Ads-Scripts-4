function remoteScript() {

/**
*
* Experiments Studio
* The script Visualises your label basesd split tests and will
* notify you by email once a test has reached statistical significance
*
*
* Version: 1.0
* maintained by Clicteq
*
**/

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

//Specify sheet url
SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Doco0G5CnNlvfHxaS4CDqKGBDL6Dhj-NePV75Dv70Lk/edit#gid=0'

//Specify which metric you want to use to determine finished test (CTR, CvR or CvR*)
SS_METRIC = 'CTR'

//Specify statistical signifance threshold (0.90, 0.95 or 0.99)
SS_THRESHOLD = 0.90

//Advertiser currency, for example '£' or 'GBP'

CURRENCY = '€'

//Email address for tests, leave blank to disable.catch
// You can add several email addresees separating them with a comma (,)

EMAIL = ["pablo.marco@faktica.com", "marcos.ferreiro@faktica.com"]


this.main = function() {


  formatted = []
  if(SS_METRIC != 'CvR*')
  {
    var ss_metric = SS_METRIC + ' Statistical Significance'
  }

  else
  {
    var ss_metric = 'CvR Statistical Significance*'
  }

var finishedTests = []


var sheet = SpreadsheetApp.openByUrl(SHEET_URL)
var input = readSheet(sheet)
var metrics = getMetrics(sheet)
var metricsParsed = parseList(metrics)
var cleared = []

var customConversions = getCustomConversions(sheet)

for(var item in input)
{


  var row = input[item]

  var accountIds = row['Google Ads Account']
  var accountsNo = 1
  if(accountsNo == 1)
  {
    if(customConversions[accountIds])
    {
      var convData = groupConv(row, customConversions[accountIds])
      var controlConv = convData[0]
      var testConv = convData[1]
    }

    else
    {
      convData = null
    }
  }




  createTab(sheet,row['Output Sheet'], metricsParsed)


  var controlRaw = []
  var testRaw = []
  var data = getData(row,'normal')
  controlRaw.push(data[0])
  testRaw.push(data[1])


  var control = group(controlRaw)
  var test = group(testRaw)

  if(convData)
  {
  control['Conversions*'] = controlConv['Conversions']
  control['CPA*'] =(control['Cost']/control['Conversions*']).toFixed(2)
  control['CvR*'] = parseFloat((control['Conversions*']/control['Clicks'])).toFixed(2)
  control['ConversionValue*'] = controlConv['ConversionValue']
  control['ROAS*'] = (control['ConversionValue*']/control['Cost']).toFixed(2)
  control['AOV*'] = (control['ConversionValue*']/control['Conversions*']).toFixed(2)
  test['Conversions*'] = testConv['Conversions']
  test['CPA*'] = (test['Cost']/test['Conversions*']).toFixed(2)
  test['CvR*'] = parseFloat((test['Conversions*']/test['Clicks']).toFixed(2))
  test['ConversionValue*'] = testConv['ConversionValue']
  test['ROAS*'] = (test['ConversionValue*']/test['Cost']).toFixed(2)
  test['AOV*'] = (test['ConversionValue*']/test['Conversions*']).toFixed(2)
       }



  var tab = sheet.getSheetByName(row['Output Sheet'])
  if(cleared.indexOf(row['Output Sheet']) == -1)
  {
  tab.getRange('A2:Z').clear()
  cleared.push(row['Output Sheet'])
  }

  tab.appendRow([row['Experiment Name']])
  var row1 = [row['label1']]
  var row2 = [row['label2']]
  try
  {
  var zScoreConv =  getZScore(control,test,'CvR','Clicks')
  test['CvR Statistical Significance'] = getSS(zScoreConv, control, test, 'Clicks')
  }
  catch(e){}
  try
  {
  var zScoreCustConv =  getZScore(control,test,'CvR*','Clicks')
  test['CvR Statistical Significance*'] = getSS(zScoreConv, control, test, 'Clicks')
  }
  catch(e){}
  try
  {
  var zScoreCtr =  getZScore(control,test,'CTR','Impressions')
  test['CTR Statistical Significance'] = getSS(zScoreCtr, control, test, 'Impressions')
  }
  catch(e){}
  // Este es el que he creado yo
  try
  {
  var zScoreConvImp =  getZScore(control,test,'CvR','Impressions')
  test['Conv/Imp Statistical Significance'] = getSS(zScoreConvImp, control, test, 'Impressions')
  }
  catch(e){}



  for(var metric in metrics)
  {
    if(control[metrics[metric]])
    {
   row1.push(control[metrics[metric]])
    }
    else
    {
      row1.push('')
    }
   row2.push(test[metrics[metric]])
  }



  tab.appendRow(row1)
  tab.appendRow(row2)
  tab.appendRow([' '])



  var ss = test[ss_metric]
  if(ss == 'Not significant' || ss == 'Not enough data')
  {
    ss = 0
  }

  if(ss >= SS_THRESHOLD)
  {
    finishedTests.push(row['Experiment Name'])

  }

	if(formatted.indexOf(row['Output Sheet']) == -1)
    {
  	formatted.push(row['Output Sheet'])
    }



}


for(sheet in formatted)
{
  	format(formatted[sheet])
}
  if(EMAIL != '')
  {
  sendEmail(finishedTests)
  }


}




function readSheet(sheet)
{

  var raw = sheet.getDataRange().getValues()
  var header = raw[0]
  var values = raw.slice(1, raw.length)

  var data = []

  for(var i = 0; i < values.length; i++)
  {
    var temp = {}
  for(key in header)
  {
    var column = header[key]
    if(column != 'Start Date' && column != 'End Date' && column != 'Compare Labels')
    {
      temp[column] = values[i][key]
    }
   	else if(column == 'Start Date' || column == 'End Date')
    {if(values[i][key] != '')
    {
      temp[column] = parseDate(values[i][key])
    }
     else
     {
       temp[column] = generateYesterday()
     }
    }
     else if(column == 'Compare Labels')
     {
       temp['label1'] = values[i][key].split(',')[0]
       temp['label2'] = values[i][key].split(',')[1]
     }

  }
    data.push(temp)

  }


  return data


}

function getLabelId(label)
{

  return AdWordsApp.labels().withCondition('Name = '+ "'" + label + "'").get().next().getId()
}


function getData(row, type)
{

  var unit = row['Test Unit']
  var labelId1 = getLabelId(row['label1'])
  var labelId2 = getLabelId(row['label2'])

  var timeFrame = row['Start Date'] + ',' + row['End Date']


  if(unit == 'Ad')
  {
    var reportType = 'AD_PERFORMANCE_REPORT'
  }
  else if(unit == 'Ad Group')
  {
    var reportType = 'AD_GROUP_PERFORMANCE_REPORT'
  }
  else if(unit == 'Campaign')
  {
    var reportType = 'CAMPAIGN_PERFORMANCE_REPORT'
  }



  var query = "SELECT Impressions, Clicks, Cost, Conversions, ConversionValue, AveragePosition FROM %reportType WHERE Labels CONTAINS_ANY [%labelId] DURING " + timeFrame
  var queryConversions = "SELECT Conversions, ConversionValue, ConversionCategoryName FROM %reportType WHERE Labels CONTAINS_ANY [%labelId] DURING " + timeFrame


  var query1 = query.replace('%labelId', labelId1).replace('%reportType',reportType)
  var query2 = query.replace('%labelId', labelId2).replace('%reportType',reportType)

  var query3 = queryConversions.replace('%labelId', labelId1).replace('%reportType',reportType)
  var query4 = queryConversions.replace('%labelId', labelId2).replace('%reportType',reportType)

  if(type == 'normal')
  {
  return[AdWordsApp.report(query1).rows(),AdWordsApp.report(query2).rows()]
  }
  else if(type == 'conv')
  {

    return[AdWordsApp.report(query3).rows(),AdWordsApp.report(query4).rows()]
  }


}

function groupConvHelper(rows, name)
{
  var temp = {'Conversions':0, 'ConversionValue':0}
  while(rows.hasNext())
  {
    var row = rows.next()
    if(row['ConversionCategoryName'] == name)
    {
      temp['Conversions'] = parseFloat(row['Conversions'].replace(',').replace(',')) + temp['Conversions']
      temp['ConversionValue'] = parseFloat(row['ConversionValue'].replace(',').replace(',')) + temp['ConversionValue']
    }
  }

  return temp
}


function groupConv(row, name)


{
  var data = getData(row, 'conv')
  var a = data[0]
  var b = data[1]


  var groupedA = groupConvHelper(data[0],name)
  var groupedB = groupConvHelper(data[1],name)

  return [groupedA,groupedB]


}

function group(reports)
{
 //var metrics = ['Impressions', 'Conversions', 'ConversionValue', 'Clicks', 'Cost']
 var temp = {'Impressions':0, 'Conversions':0, 'ConversionValue':0, 'Clicks':0, 'Cost':0}
 var metrics = Object.keys(temp)
 var impressions = []
 var positions = []
 var avgPos = 0

 for(report in reports)
 {
   data = reports[report]
 while(data.hasNext())
 {
   var row = data.next()

   for(var metric in metrics)
   {
     temp[metrics[metric]] = temp[metrics[metric]] + parseFloat(row[metrics[metric]].replace(',','').replace(',',''))

   }
     impressions.push(parseFloat(row['Impressions']))
     positions.push(parseFloat(row['AveragePosition']))

 }
 }
  //Logger.log(positions)
  for (var position in positions)
  {
    avgPos = avgPos + (positions[position]*(impressions[position]/temp['Impressions']))
  }

  temp['AOV'] = (temp['ConversionValue']/temp['Conversions']).toFixed(2)
  temp['CTR'] = parseFloat((temp['Clicks']/temp['Impressions']).toFixed(4))
  temp['CPA'] = (temp['Cost']/temp['Conversions']).toFixed(2)
  temp['CPC'] = (temp['Cost']/temp['Clicks']).toFixed(2)
  temp['CvR'] = parseFloat((temp['Conversions']/temp['Clicks']).toFixed(4))
  temp['Conv/Imp'] = parseFloat((temp['Conversions']/temp['Impressions']).toFixed(4))
  temp['ROAS'] = (temp['ConversionValue']/temp['Cost']).toFixed(2)
  temp['Avg. Pos'] = avgPos.toFixed(2)

  return temp
}

function createTab(sheet,name, metricsParsed)
{

  try
  {
  sheet.insertSheet(name)
  }
  catch(e)
  {}
  if(  sheet.getSheetByName(name).getDataRange().getValues()[0].length == 1)
  {
      sheet.getSheetByName(name).appendRow(([''].concat(metricsParsed)))
  }
}


function parseDate(value)
{

  value = value.replace('.','').replace('.','')
  var year = value.slice(4,6)
  var month = value.slice(2,4)
  var day = value.slice(0,2)
  return '20' + year + month + day
}

function generateYesterday()
{
  var oneDay = 1000 * 60 * 60 * 24
  var yesterday = new Date(new Date() - oneDay)
  return Utilities.formatDate(yesterday, 'gmt', 'YMMdd')
}



function getCustomConversions(sheet)
{


  var values = sheet.getSheetByName('Custom Conversions').getDataRange().getValues()
  values = values.slice(1,values.length)
  var parsed = {}

  for(var value in values)
  {
    parsed[values[value][0]] = values[value][1]
  }

  return parsed
}


function getMetrics(sheet)
{

  var values = sheet.getSheetByName('Output Template').getDataRange().getValues()
  values = values.slice(1,values.length)
  var parsed = []

  for(var value in values)
  {
    if(values[value][1] == 'Y')
    {
   parsed.push(values[value][0])
    }

  }

  return parsed

}



function parseList(list)
{var temp = []
  for(var l in list)
  {
    temp.push(list[l])
  }

 return temp
}



function getSS(zScoreTotal, control, test, controlMetric)
{
if ( (control[controlMetric] > 100) && (test[controlMetric] > 100) )
{
	 if (zScoreTotal > 2.33){
		return(0.99)

	}
      else if (zScoreTotal > 1.65){
		return(0.95)

	}
      else if (zScoreTotal > 1.29){
		reutrn(0.90)

	}
    else if(zScoreTotal < -2.33){
      return(0.99)
      }
    else if(zScoreTotal < -1.65){
      return(0.95)
      }
    else if(zScoreTotal < -1.29){
      return(0.90)
      }
  else
  {
    return('Not significant')
  }
}

  else {
	return('Not enough data')
  }


}

function standardError(object, metric, controlMetric){

  var a = object[metric] * (1 - object[metric])
	var insideRadical = a/ object[controlMetric]
	var se = Math.sqrt(insideRadical)
  return se
}

function getZScore(control, test, metric, controlMetric){

  var a = control[metric] - test[metric]
  var b = Math.sqrt(Math.pow(standardError(control, metric, controlMetric),2) + Math.pow(standardError(test, metric, controlMetric),2))
  return a/b
}




function sendEmail(finishedTests)
{
  if(finishedTests.length == 0)
  {
    finishedTests = ['No finished tests']
  }
  var title = "Análisis de tests A/B de anuncios de la cuenta DKV"

  var body = 'Los tests que han terminado con resultados estadísticamente '
  body = body + 'significativos son los siguientes:' + '\n\n'

  for(var test in finishedTests)
  {
    body = body + finishedTests[test] + '\n'
  }

  body = body + '\n\n' + SHEET_URL

  MailApp.sendEmail(EMAIL.join(", "), '', title, body)
}


function format(name)
{
  var rules = []
  var sheet = SpreadsheetApp.openByUrl(SHEET_URL)
  var tab = sheet.getSheetByName(name)
  tab.getRange('A1:X1').setFontWeight('bold')
  tab.setRowHeight(1, 70)
  tab.getRange('A1:Z1').setVerticalAlignment('middle')
  tab.getRange('A:Z').setHorizontalAlignment('CENTER')
  var i = 2
  while(i < 100)
  {
    tab.getRange('A' + i + ':X' +i).setFontWeight('bold')
    i = i + 4
  }

  var _names = sheet.getRange(name+'!A1:R1').getValues()
  var names = []
  for(var _name in _names[0])
  {
    if(_names[0][_name] != '')
    {
    names.push(_names[0][_name])
    }
  }

  var money = ['CPC','AOV','CPA','CPA*','AOV*']
  var percentage = ['CTR','CvR','CvR*','ROAS','CTR Statistical Significance', 'CvR Statistical Significance', 'CvR Statistical Significance*', 'Conv/Imp', 'Conv/Imp Statistical Significance']
  var ss = ['CTR Statistical Significance', 'CvR Statistical Significance', 'CvR Statistical Significance*', 'Conv/Imp Statistical Significance']



  var mapping = {0:'B',1:'C',2:'D',3:'E',4:'F',5:'G',6:'H',7:'I',8:'J',9:'K',10:'L',11:'M',12:'N',13:'O',14:'P',15:'Q',16:'R'}

  for(var item in money)
  {
    var column = names.indexOf(money[item])
    if(column == -1)
    {continue}
    else
    {
      var position = mapping[column]
      var range = name + '!' + position + ':' + position


      sheet.getRange(range).setNumberFormat(CURRENCY + ' 0.00')
    }
  }


  for(var item in percentage)
  {
    var column = names.indexOf(percentage[item])
    if(column == -1)
    {continue}
    else
    {
      var position = mapping[column]
      var range = name + '!' + position + ':' + position
      sheet.getRange(range).setNumberFormat('0.0%')

      if(ss.indexOf(percentage[item]) != -1)
      {


        var a = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThan(SS_THRESHOLD - 0.01)
        .setBackground('#90EE90')
        .setRanges([sheet.getRange(range)])
        .build()

        var b = SpreadsheetApp.newConditionalFormatRule()
		    .whenTextContains('Not')
        .setBackground('#F08080')
        .setRanges([sheet.getRange(range)])
        .build()

        var c = SpreadsheetApp.newConditionalFormatRule()
		    .whenNumberLessThan(SS_THRESHOLD)
        .setBackground('#F08080')
        .setRanges([sheet.getRange(range)])
        .build()

        rules.push(a)
        rules.push(b)
        rules.push(c)


      }
    }
  }

  tab.setConditionalFormatRules(rules)
  tab.autoResizeColumns(1, tab.getLastColumn())

}






}

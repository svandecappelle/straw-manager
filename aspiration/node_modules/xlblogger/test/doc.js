var xlblogger = require('../');
var logger = new xlblogger('Alpha','C:/XLBlogger');

logger.logValColor('XLBlogger'); // Default Coloration

var FgMagenta = '\x1b[35m'; // Magenta font color Code
logger.logValColor('XLBlogger',FgMagenta);

logger.logThis('Simple string, no console coloration !');
logger.logTree('One','Two','Three');

logger.logBlank();
logger.logAttrVal('Name','Marou');


// output Objects
var data = {}
data.id = 21220244
data.value = "######"
data.name = 'Marou'
data.pwd = '*******'
data.email = 'test@xlblogger.npm'


logger.output(data)

var out = new xlblogger('testOut','C:/XLBlogger');

out.output('Information');

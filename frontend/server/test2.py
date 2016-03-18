#!/usr/local/anaconda/bin/python2.7
################################################################################
#                                 CGE Pipeline                                 #
################################################################################
# This script is main body of the CGE Pipeline structure
#--> The input/arguments are parsed and validated
#--> Log isolate submission in SQL
#--> Retrieve isolate ID
#--> Create isolate folder and subfolders
#--> The input files are moved to the 'Input' directory and zipped
#--> Check the requested service parameters and execute the service (subprocess)
#--> Print outputpage:
#      * Summary of errors with guide to fix them
#      * Redirection link to isolate overview page
#      * Link to CGE pipeline for submission of another query
#--> Clean up old files from upload directory

# Including the CGE modules!
import sys, os, glob, re
from datetime import datetime
from subprocess import Popen, PIPE
sys.path.append("/home/data1/services/CGEpipeline/CGEmodules")
from functions_module_2 import (UpdatePaths, copyFile, program, add2DatabaseLog,
                                getArguments, paths, makeFileList, fileUnzipper,
                                printInputFilesHtml, dlButton, PrepareDownload,
                                AddIsolate2DB, CheckFileType, UpdateIsolate,
                                printOut, moveFile, setDebug, createIsolateDirs,
                                GraceFullExit, printDebug, tsv2html, fileZipper,
                                FixPermissions, proglist, getnote, AddFile2DB,
                                printLog, RetrieveContigsInfo, open_, adv_dict,
                                GetServiceResults, Reg)

################################################################################
#                                  FUNCTIONS                                   #
################################################################################
def WaitForAssembly(proglist):
   ''' Checking the status of the assembler, and waiting for it to finish if
   it is still running. '''
   # Verify that assembly is submitted
   if proglist.Exists('Assembler'):
      status = proglist['Assembler'].GetStatus()
      if status == 'Executing':
         printDebug("\nWaiting for Assembly to finish...") #DEBUG
         proglist['Assembler'].WaitOn(pattern='Done', ePattern='Error')
         status = proglist['Assembler'].GetStatus()
         # THE SUCCESS OF THE ASSEMBLY IS VALIDATED
         if status == 'Done':
            printNsave(template_line%'The Assembly was finished...')
            # Retrieve contigs path
            contig_data = RetrieveContigsInfo(args.usr, args.token, isolateID)
            if contig_data is not None:
               path, fid = contig_data
               # Removing the gz extension
               if path[-3:]=='.gz': path = path[:-3]
               # Checking if the file exists as normal or gzipped file
               if os.path.exists(path):
                  paths.add_path('contigs', path)
               elif os.path.exists(path+'.gz'):
                  paths.add_path('contigs', path+'.gz')
               else:
                  printDebug("Contigs could not be found! (%s)"%(path))
                  printNsave(template_line%'The contigs file could not be found!')
                  status = 'Failure'
                  proglist['Assembler'].status = status
            else:
               printNsave(template_line%'No suitable contigs was created by the assembler!')
               status = 'Failure'
               proglist['Assembler'].status = status
      if status == 'Done': return True, fid
      else: return False, None
   else:
      return True, None

def printNsave(*lst):
   '''  '''
   outputfile = paths['logs']+"/pipeline.out"
   if os.path.exists(paths['logs']) and not os.path.exists(outputfile):
      # Creating output file
      with open(outputfile, 'w') as f: pass
   printLog(outputfile, True, False, *lst)

def CMDout2list(cmd):
   ''' Executes a command through the operating system and returns the output
   as a list, or on error a string with the standard error.
   EXAMPLE:
      >>> from subprocess import Popen, PIPE
      >>> CMDout2array('ls -l')
   '''
   p = Popen(cmd, stdout=PIPE, stderr=PIPE, shell=True)
   stdout, stderr = p.communicate()
   if p.returncode != 0 and stderr != '': return "ERROR: %s\n"%(stderr)
   else: return stdout.split('\n')

################################################################################
#                                    MAIN                                      #
################################################################################
# SET GLOBAL VARIABLES
setDebug(True)
service, version = "CGEpipeline", "1.1"
app_uploaddir    = "/srv/www/htdocs/tools/server/uploader/isolates/"

# PARSE ARGUMENTS
# Add service specific arguments using the following format:
#(OPTION,   VARIABLE,  DEFAULT,  HELP)
#args = getArguments([
#   ('--uploadpath',  'uploadPath',  None, 'The folder containing uploads'),
#   ('--sequencing_platform',   'sequencing_platform',  None, 'The sequencing platform of the input file')])
#
# Or by pasting the argument lines from the contigs file

# source_note, pathogenicity_note, notes WAS textarea before

args = getArguments('''
selectionbox   sequencing_platform           --sequencing_platform    VALUE
selectionbox   sequencing_type               --sequencing_type        VALUE
selectionbox   pre_assembled                 --pre_assembled          VALUE
text                            sample_name                   --sample_name            VALUE
text                            sample_type                   --sample_type            VALUE
text           usage_restrictions            --usage_restrictions     VALUE
text           release_date                  --release_date            VALUE

text                            country                                --country                VALUE
text                            region                                 --region                      VALUE
text                            city                          --city                   VALUE
text                            zip_code                                                      --zip_code                       VALUE
text                            longitude                                   --longitude                        VALUE
text                            latitude                                            --latitude                         VA
LUE

text                            go_country                                  --go_country             VALUE
text                            go_region                                   --go_region                   VALUE
text                            go_city                       --go_city                VALUE
text                            go_zip_code                                 --go_zip_code                           VALUE
text                            go_longitude                        --go_longitude                          VALUE
text                            go_latitude                                 --go_latitude                           VALUE

text                            location_uncertainty_flag               --location_uncertainty_flag   VALUE
text                            date_uncertainty_flag                   --date_uncertainty_flag       VALUE

text                            location_note                       --location_note          VALUE
text                            collection_date               --collection_date        VALUE
selectionbox   isolation_source             --isolation_source           VALUE
text                            organism                      --organism               VALUE
text                            strain                        --strain                 VALUE
text                            subtype                       --subtype                VALUE
text                            collected_by                  --collected_by           VALUE
textarea                        source_note                                 --source_note            VALUE
selectionbox   pathogenic                    --pathogenic                           VALUE
textarea                        pathogenicity_note            --pathogenicity_note     VALUE
textarea                        notes                         --notes                  VALUE

checkbox       assembleroptions  --ao        VALUE

selectionbox   speciestyping     --SpT       VALUE
selectionbox   straintyping      --StT       VALUE
selectionbox   phenotyping       --PT        VALUE

selectionbox   KFscoring         --KFs       VALUE
selectionbox   KFdatabase        --KFd       VALUE

selectionbox   MLSTscheme        --Ms        VALUE

selectionbox   pMLSTscheme       --Ps        VALUE

selectionbox   RFthreshold       --RT        VALUE
selectionbox   RFminlength       --Rl        VALUE
mselectionbox  RFdatabase        --Ra        VALUE

selectionbox   VFthreshold       --VT        VALUE
mselectionbox  VFdatabase        --Va        VALUE

selectionbox   PFthreshold       --PFT       VALUE
mselectionbox  PFdatabase        --PFa       VALUE

selectionbox   PtaxModel         --PTM       VALUE
''', allowcmd=True)

# ADD DEFAULT VALUES
if args.assembleroptions is None: args.assembleroptions = ''
if args.KFscoring is None: args.KFscoring = 'winner'
if args.KFdatabase is None: args.KFdatabase = 'bacteria_o'
if args.speciestyping is None: args.speciestyping = 'KmerFinder,PlasmidFinder'
if args.straintyping is None: args.straintyping = 'MLST'
if args.phenotyping is None: args.phenotyping = 'ResFinder,VirulenceFinder'
if args.PFthreshold is None: args.PFthreshold = '80.00'
if args.PFdatabase is None: args.PFdatabase = 'plasmid_database' # ,plasmid_positiv
if args.RFthreshold is None: args.RFthreshold = '98.00'
if args.RFminlength is None: args.RFminlength = '0.60'
if args.RFdatabase is None: args.RFdatabase = 'aminoglycoside,beta-lactamase,quinolone,fosfomycin,fusidicacid,vancomycin,
macrolide,phenicol,rifampicin,sulphonamide,tetracycline,trimethoprim'
if args.VFthreshold is None: args.VFthreshold = '90.00'
if args.VFdatabase is None: args.VFdatabase = 'virulence_ecoli,virulence_ENT,s.aureus_adherence,s.aureus_toxin,s.aureus_e
xoenzyme,s.aureus_hostimm,s.aureus_secretion'
if args.PtaxModel is None: args.PtaxModel = 'auto'

# HANDLE BOOLEAN ARGUMENTS
if isinstance(args.pre_assembled, str) and args.pre_assembled.lower() == 'yes': args.pre_assembled = True
else: args.pre_assembled = False


# VALIDATION OF SERVICE SPECIFIC ARGUMENTS
if args.speciestyping != '': speciestyping = args.speciestyping.split(',')
else: speciestyping = []
if args.straintyping != '': straintyping = args.straintyping.split(',')
else: straintyping = []
if args.phenotyping != '': phenotyping = args.phenotyping.split(',')
else: phenotyping = []

if args.sequencing_platform is None or args.sequencing_platform == '':
   GraceFullExit("Error: No sequencing platform was chosen!\n")
valid_seqtypes = ['single', 'paired', 'mate-paired', 'unknown']
if args.sequencing_type not in valid_seqtypes:
   GraceFullExit("Error: No valid sequencing type was chosen!\n'%s' is not in %s\n"%(args.sequencing_type,valid_seqtypes)
)

if (     'PlasmidFinder' in speciestyping
     and
         (    args.PFthreshold == ''
           or args.PFdatabase == ''
         )
   ):
   GraceFullExit("Error: PlasmidFinder threshold and/or database was "
                 "missing!\n")

if (         'MLST' in straintyping
     and     args.organism == ''
     and not 'KmerFinder' in speciestyping
   ):
   GraceFullExit("Error: Neither organism nor species typing algorithm was "
                 "chosen!\n")

if (         'pMLST' in straintyping
     and     args.pMLSTscheme == ''
     and not 'PlasmidFinder' in speciestyping
   ):
   GraceFullExit("Error: Neither pMLST Scheme nor species typing algorithm was "
                 "chosen!\n")

if (     'ResFinder' in phenotyping
     and
         (    args.RFdatabase == ''
           or args.RFminlength == ''
         )
   ):
   GraceFullExit("Error: Missing ResFinder threshold or database or minlength "
                 "arguments!\n")

if (     'VirulenceFinder' in phenotyping
     and
         (    args.VFthreshold == ''
           or args.VFdatabase == ''
         )
   ):
   GraceFullExit("Error: Missing VirulenceFinder threshold or database "
                 "arguments!\n")

if 'PathogenFinder' in phenotyping and args.PtaxModel == '':
   GraceFullExit("Error: Missing modelselection for PathogenFinder!\n")

# VALIDATION OF META DATA ARGUMENTS
if args.country != '': # country + city
   if args.longitude == '': args.longitude = None # Martin changed to None from ''
   if args.latitude == '': args.latitude = None # Martin changed to None from ''
elif args.longitude != '' and args.latitude != '': # longitude + latitude
   if args.country == '': args.country = '' # Jose changed
   if args.city == '': args.city = '' # Jose changed
else:
   GraceFullExit("Error: Missing meta data 'Country' or 'Longitude' + "
                 "'Latitude'!\n")

if args.collection_date == '':
   GraceFullExit("Error: Missing meta data 'Date'!\n")
if args.isolation_source == '':
   GraceFullExit("Error: Missing meta data 'Origin'!\n")

try: args.release_date = datetime.date(*[int(x) for x in args.release_date.split('-')])
except: args.release_date = None
# EXTRACT META DATA NOTES
args.location_note = getnote(args.location_note)
args.source_note = getnote(args.source_note)
args.pathogenicity_note = getnote(args.pathogenicity_note)
args.notes = getnote(args.notes)

# Log isolate submission in SQL and Retrieve isolate ID
isolateID, ifolder = AddIsolate2DB(args)
if isolateID is None: GraceFullExit("Error: The Isolate ID was not returned!\n")

print("\nisolate_id=%s\n" %isolateID)


# SET, UPDATE AND CREATE DIRECTORY PATHS
createIsolateDirs(ifolder, service, version)

# MOVE UPLOADS FROM APP- TO ISOLATE UPLOAD DIRECTORY
if args.webmode: moveFile(args.uploadPath+'/*', paths['uploads'])
else: copyFile(args.uploadPath+'/*', paths['uploads'])

fileZipper(paths['uploads'])
inputFiles = makeFileList(paths['uploads'])

# Update isolate file locations
UpdateIsolate(isolateID, inputFiles)

# PRINT HTML OUTPUT
template_line = '<li>%s</li>'
template_head = '<h1>%s</h1><ul id="plan">'
printNsave(template_head%('Bacterial Analysis Summary Report'))

# EXECUTE CONTIGS INDEPENDENT PIPELINE SERVICES
if not args.pre_assembled:
   # ASSEMBLE THE READS
   assembler = program( name='Assembler',
      ptype=None, path=paths['programRoot']+'Assembler-1.0.py',
      workDir=paths['services'], ssh=False, toQueue=False, wait=False,
      args=['--iid',     isolateID,
            '--ip',      args.ip,
            '--usr',     args.usr,
            '--token',   args.token,
            '--options', args.assembleroptions
            ]
      )
   if args.webmode: assembler.AppendArgs('-w')
   assembler.Execute()
   proglist.Add2List(assembler)
   printNsave(template_line%'Assembler was executed according to plan...')
else:
   # Validate that only 1 file was submitted
   if len(inputFiles) != 1:
      printDebug("Error: Invalid number of contig files (%s)\n"%(len(inputFiles)))
      sys.exit(1)
   # Validate that the uploaded file is fasta
   if CheckFileType(inputFiles[0]) != 'fasta':
      printDebug("Error: Invalid contigs format (%s)!\nOnly the fasta format is recognised as a proper contig format.\n"%
(CheckFileType(inputFiles[0])))
      sys.exit(1)
   # Add mySQL entry for the contigs
   fid = AddFile2DB(isolateID, None, args.usr, 'contigs', inputFiles[0], 'Preassembled contigs')
   # Add the contigs path to the paths object
   paths.add_path('contigs', inputFiles[0])

# SPECIES TYPING
predicted_species = 'unknown'
if 'KmerFinder' in speciestyping: # KmerFinder
   kmerfinder = program(name='KmerFinder',
      ptype=None, path=paths['programRoot']+'KmerFinder-2.1.py',
      workDir=paths['services'], ssh=False, toQueue=False, wait=False,
      args=['--iid',   isolateID,
            '--ip',    args.ip,
            '--usr',   args.usr,
            '--token', args.token,
            '-s',      args.KFscoring,
            '-d',      args.KFdatabase
            ]
      )
   if args.webmode: kmerfinder.AppendArgs('-w')
   if args.pre_assembled:
      kmerfinder.AppendArgs(['-f', paths['contigs']])
   else:
      kmerfinder.AppendArgs(['-f', inputFiles[0]])
   kmerfinder.Execute()
   proglist.Add2List(kmerfinder)
   printNsave(template_line%'KmerFinder was executed according to plan...')

if 'SpeciesFinder' in speciestyping:
   # Setup SpeciesFinder
   pass

# EXECUTE CONTIGS DEPENDENT PIPELINE SERVICES
if not args.pre_assembled: assembly_done, fid = WaitForAssembly(proglist)
else: assembly_done = True
if not assembly_done:
   printDebug("\nError: Assembly failed, thus all contigs dependent services "
              "were not able to run!")
else:
   # ContigAnalyzer
   contiganalyzer = program( name='ContigAnalyzer',
      ptype=None, path=paths['programRoot']+'ContigAnalyzer-1.0.py',
      workDir=paths['services'], ssh=False, toQueue=False, wait=False,
      args=['--iid',   isolateID,
            '--ip',    args.ip,
            '--usr',   args.usr,
            '--token', args.token,
            '--fid', fid
            ]
      )#            '-f', paths['contigs'],
   if args.webmode: contiganalyzer.AppendArgs('-w')
   contiganalyzer.Execute()
   proglist.Add2List(contiganalyzer)
   printNsave(template_line%'ContigAnalyzer was executed according to plan...')

   if 'PathogenFinder' in phenotyping: # PathogenFinder
      pathogenfinder = program( name='PathogenFinder',
         ptype=None, path=paths['programRoot']+'PathogenFinder-1.1.py',
         workDir=paths['services'], ssh=False, toQueue=False, wait=False,
         args=['--iid',   isolateID,
               '--ip',    args.ip,
               '--usr',   args.usr,
               '--token', args.token,
               '-m', args.PtaxModel,
               '-f', paths['contigs'],
               ]
         )
      if args.webmode: pathogenfinder.AppendArgs('-w')
      pathogenfinder.Execute()
      proglist.Add2List(pathogenfinder)
      printNsave(template_line%'PathogenFinder was executed according to plan...')

   if 'ResFinder' in phenotyping: # ResFinder
      resfinder = program( name='ResFinder',
         ptype=None, path=paths['programRoot']+'ResFinder-2.1.py',
         workDir=paths['services'], ssh=False, toQueue=False, wait=False,
         args=['--iid',   isolateID,
               '--ip',    args.ip,
               '--usr',   args.usr,
               '--token', args.token,
               '-T', args.RFthreshold,
               '-a', args.RFdatabase,
               '-L', args.RFminlength,
               '-f', paths['contigs'],
               ]
         )
      if args.webmode: resfinder.AppendArgs('-w')
      resfinder.Execute()
      proglist.Add2List(resfinder)
      printNsave(template_line%'ResFinder was executed according to plan...')

   # Wait on Species Prediction
   printDebug('speciesTyping check: %s %s %s'%(len(speciestyping) > 0, len(speciestyping), speciestyping))
   if len(speciestyping) > 0:
      predicted_species = 'unknown'
      liniage = []
      proglist['KmerFinder'].WaitOn(pattern='Done', ePattern='Error')
      status = proglist['KmerFinder'].GetStatus()
      # THE SUCCESS OF THE ASSEMBLY IS VALIDATED
      printDebug('KmerFinder status: %s'%status)
      if status == 'Done':
         try:
            printDebug('Trying... %s'%(sorted(glob.glob(paths['services']+'KmerFinder*/downloads/results_tax.tab.gz'))[-1
]))
            result_file = sorted(glob.glob(paths['services']+'KmerFinder*/downloads/results_tax.tab.gz'))[-1]
            printDebug('KmerFinder result_file: %s'%result_file)
            with open_(result_file) as f:
               # Skip header
               ##Template       Score   Expected        z       p_value frac_q  frac_d  coverage        total frac_q    t
otal frac_d     total coverage  Kmers in Template       Description     TAXID   Taxonomy        TAXID Species   Species
               _ = f.readline()
               #Escherichia_coli_K_12_substr__MG1655_uid57779       4619             188           322.7        2.8e-23 1
.1e-03  4.6e-01 9.4e-01 1.1e-03 4.6e-01 9.4e-01     9991        gi|556503834|ref|NC_000913.3|   511145  cellular organism
s; Bacteria; Proteobacteria; Gammaproteobacteria; Enterobacteriales; Enterobacteriaceae; Escherichia; Escherichia coli; E
scherichia coli K-12; Escherichia coli str. K-12 substr. MG1655;        562     Escherichia coli
               hit = f.readline().split('\t')
               printDebug('KmerFinder hit: %s'%hit)
               predicted_species = hit[-1].strip()
               liniage = [x.strip() for x in hit[-3].split(';')]
               if liniage == ['Unknown']: liniage=[]
         except: pass

      printDebug('\npredicted_species: %s\nLiniage: %s'%(predicted_species, ';'.join(liniage)))

      # SEQUENCE TYPING
      if 'MLST' in straintyping: # MLST
         # Find MLST Scheme
         MLSTscheme = ''
         if args.organism == '' or predicted_species == 'unknown' or predicted_species == '':
            printNsave(template_line%'MLST could not be executed since the species was neither predicted nor provided!')
         else:
            genus_lvl_name = predicted_species.split()[0] + ' spp.'
            mlst_schemes = CMDout2list("sed 's/#[1-9]//' /home/data1/services/MLST/mlst_schemes2 | egrep -v '_2|#'")
            try:
               mlst_schemes = dict([reversed(x.split('\t')) for x in mlst_schemes if len(x) > 0])
               # Manual Exceptions
               mlst_schemes['Shigella spp.'] = 'ecoli'
               if predicted_species in mlst_schemes.keys():
                  MLSTscheme = mlst_schemes[predicted_species]
               elif genus_lvl_name in mlst_schemes.keys():
                  MLSTscheme = mlst_schemes[genus_lvl_name]
               elif args.organism in mlst_schemes.keys():
                  MLSTscheme = mlst_schemes[args.organism]
            except Exception, e:
               printDebug("ERROR: MLST Scheme...", e, predicted_species, genus_lvl_name, mlst_schemes)
            if MLSTscheme == '':
               printNsave(template_line%'MLST could not be executed since no appropriate MLST scheme matched the organism
 name! Following scheme names failed: %s, %s, and %s'%(predicted_species, genus_lvl_name, args.organism))
            else:
               mlst = program( name='MLST',
                  ptype=None, path=paths['programRoot']+'MLST-1.6.py',
                  workDir=paths['services'], ssh=False, toQueue=False, wait=False,
                  args=['--iid',   isolateID,
                        '--ip',    args.ip,
                        '--usr',   args.usr,
                        '--token', args.token,
                        '-f', paths['contigs'],
                        '-o', MLSTscheme,
                        '-w']
                  )
               mlst.Execute()
               proglist.Add2List(mlst)
               printNsave(template_line%'MLST was executed according to plan...')

      # PLASMID TYPING (includes pMLST)
      if 'PlasmidFinder' in speciestyping: # PlasmidFinder
         #liniage = ['Enterobacteriaceae'] # temporary hardcoding, replace with liniage predicted by KmerFinder
         supported_liniages = ['Enterobacteriaceae']
         printDebug('Liniage check: %s in %s (%s)'%(supported_liniages, liniage, predicted_species))
         if any([sl in liniage for sl in supported_liniages]) or len(liniage) == 0:
            plasmidfinder = program( name='PlasmidFinder',
               ptype=None, path=paths['programRoot']+'PlasmidFinder-1.2.py',
               workDir=paths['services'], ssh=False, toQueue=False, wait=False,
               args=['--iid',   isolateID,
                     '--ip',    args.ip,
                     '--usr',   args.usr,
                     '--token', args.token,
                     '-T', args.PFthreshold,
                     '-a', args.PFdatabase,
                     '-f', paths['contigs'],
                     ]
               )
            if args.webmode: plasmidfinder.AppendArgs('-w')
            plasmidfinder.Execute()
            proglist.Add2List(plasmidfinder)
            printNsave(template_line%'PlasmidFinder was executed according to plan...')

      # Virus phenotyping
      if 'VirulenceFinder' in phenotyping: # VirulenceFinder
         VFdatabases = {
            'Escherichia coli':        ['virulence_ecoli']#,
            #'Staphylococcus aureus':   [
            #   's.aureus_adherence', 's.aureus_toxin', 's.aureus_exoenzyme',
            #   's.aureus_hostimm', 's.aureus_secretion'
            #],
            #'Enterococcus':            ['virulence_ENT']
         }
         #liniage = ['Escherichia coli', 'Staphylococcus aureus', 'Enterococcus'] # temporary hardcoding, replace with li
niage predicted by KmerFinder
         if len(liniage) > 0:
            VFdatabase_sel = ','.join([','.join(VFdatabases[db]) for db in VFdatabases.keys() if db in liniage])
         else:
            VFdatabase_sel = ','.join([','.join(db) for db in VFdatabases.values()])
         printDebug('Liniage check: %s in %s (%s, %s)'%(VFdatabases.keys(), liniage, predicted_species, VFdatabases))
         if VFdatabase_sel != '':
            virulencefinder = program( name='VirulenceFinder',
               ptype=None, path=paths['programRoot']+'VirulenceFinder-1.2.py',
               workDir=paths['services'], ssh=False, toQueue=False, wait=False,
               args=['--iid',   isolateID,
                     '--ip',    args.ip,
                     '--usr',   args.usr,
                     '--token', args.token,
                     '-T', args.VFthreshold,
                     '-a', VFdatabase_sel,
                     '-f', paths['contigs'],
                     ]
               )
            if args.webmode: virulencefinder.AppendArgs('-w')
            virulencefinder.Execute()
            proglist.Add2List(virulencefinder)
            printNsave(template_line%'VirulenceFinder was executed according to plan...')

# Wait on Services to finish
printDebug('\nWait on all services to finish...')
for progname in proglist.list: proglist[progname].WaitOn()

# PROCESS RESULTS AND PRESENT RESULTS REPORT
# Extract result from sql database and convert to an advance dict
data = adv_dict({'results': GetServiceResults(isolateID, args.usr)})
data['scripts'] = {'hide': []}
# Add dynamic scripts
if not 'assembler' in data['results']: data['scripts']['hide'].append({'id': 'assembler'})
else: data['scripts']['hide'].append({'id': 'preassembled'})
if not 'virulencefinder' in data['results']: data['scripts']['hide'].append({'id': 'virulencefinder'})
if not 'pathogenfinder' in data['results']: data['scripts']['hide'].append({'id': 'pathogenfinder'})
# Get report template
report_template = paths['programRoot']+'/etc/report_template.html'
with open(report_template) as f: template = f.read()

# Replace all repeat sections
repeat_pattern_obj = Reg('\{\{\REPEAT:([\w\._]+?)\%(.+?)\%\}\}', 'I')
repeat_subpattern_obj = Reg('\{\{\REPEAT.([\w\._]+?)\}\}', 'I')
while repeat_pattern_obj.match(template):
   repeat_list =     data.gettree(repeat_pattern_obj.getgroup(1).split('.'))
   if not isinstance(repeat_list, list): repeat_list = [repeat_list] if repeat_list else []
   repeat_template = repeat_pattern_obj.getgroup(2)
   if repeat_list is None:
      printDebug('Warning: Unknown data request: %s'%(repeat_pattern_obj.getgroup(1).split('.')))
      template = repeat_pattern_obj.sub('n/a', template, 1)
      continue
   repeat_output = [repeat_template]*len(repeat_list)
   for i, repeat_item in enumerate(repeat_list): # iterate over all the plasmids (repeats)
      while repeat_subpattern_obj.match(repeat_output[i]): # iterate over all repeat variables
         repeat_output[i] = (repeat_subpattern_obj.sub(str(adv_dict(repeat_item).gettree(repeat_subpattern_obj.getgroup(1
).split('.'))), repeat_output[i], 1))
   template = repeat_pattern_obj.sub(''.join(repeat_output), template, 1)

# Substitute all placeholders
placeholder_pattern_obj = Reg('\{\{([\w\._]+?)\}\}', 'I')
while placeholder_pattern_obj.match(template):
   placeholder_data = data.gettree(placeholder_pattern_obj.getgroup(1).split('.'))
   if placeholder_data is None:
      printDebug('Warning: Unknown data request: %s'%(placeholder_pattern_obj.getgroup(1).split('.')))
      template = placeholder_pattern_obj.sub('Data Not Found', template, 1)
      continue
   template = placeholder_pattern_obj.sub(str(placeholder_data), template, 1)

# PRINT HTML OUTPUT
printNsave('</ul><script>document.getElementById("plan").style.display="None"</script>\n')
printNsave('<style>table.settings td,table.settings th { font-size: 20pt; padding: 0 0 0 20}</style>\n')
printNsave('<table class="settings">')
printNsave('<tr><td class="grey bold">Pipeline Version:</td><td><i>%s</tr>'%(version))
printNsave('<tr><td class="grey bold">Submission Date:</td><td><i>%s</tr>'%(datetime.now().strftime('%Y-%m-%d')))
printNsave('<tr><td class="grey bold">Sample Name:</td><td class="bold">%s</tr>'%(args.sample_name))
printNsave('</table>')
printNsave(template)

if args.webmode:
   # Clean up old files from upload directory
   if os.path.exists(app_uploaddir):
      # Remove folders/subfolders/files which are older that 14 days
      os.system("find %s -mindepth 1 -maxdepth 1 -mtime +14 -exec rm -rf {} \;"%(app_uploaddir))

# PRINT INPUT FILES TO OUTPUT RECORD
if len(inputFiles) > 0: printInputFilesHtml(inputFiles)

# TIME STAMPS / BENCHMARKING
proglist.PrintTimers()

# Fix permissions for folders and files
os.system("find %s -type d -print -exec chmod 775 {} \; >& /dev/null"%(paths['isolateRoot']))
os.system("find %s -type f -print -exec chmod 664 {} \; >& /dev/null"%(paths['isolateRoot']))

# INDICATE THAT THE WRAPPER HAS FINISHED
sys.stderr.write("Done")

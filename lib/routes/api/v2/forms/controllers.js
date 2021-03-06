/**
 * Forms controllers
 */


import {isDashboardAdmin} from '../helpers';
import {Collection, Form, Dashboard, Project} from 'lib/models';
import multer from 'multer';
import bus from 'lib/bus';
import _ from 'underscore';
import {maxUploadSize,publicHost} from 'config/config';
import fs from 'fs';
import slug from 'slug';
import CSV from 'comma-separated-values';
import {userHasPermission,userAdminAndPermission} from '../helpers';
import {exec} from 'child_process';

const userPVT = '_id userId picture username role name created_at';
const collectionPVT = '_id title dashboards created_at';

const notify = (type, req) => {
  bus.emit('form', {
    type: type,
    form: req.form,
    user: req.user
  });
};

/**
 * Get form details
 */
export const getForm = (req, res, next) => {
  function _getProjects (domains, is_admin) {
    Project.find({
        $and: [
          {leader: req.user._id}, // Only own projects
          {domain: {$in: domains}}
          ]
      })
      .select('-__v')
      .populate('leader', userPVT)
      .populate('contributors', userPVT)
      .populate('followers', userPVT)
      .exec(function(err, projects) {
        if(err) return res.status(500).send(err.toString());
        // Not allowed to see forms if no projects as leader
        // except if you are the dashboard administrator
        if(!is_admin && (!projects || projects.length === 0)) {
          return res.status(403).send('You have no permissions to view this form');
        }
        req.form.projects = projects;
        next();
      });
  }

  Form.findById(req.params.fid)
    .select('-__v')
    .populate('creator', userPVT)
    .exec(function(err, form) {
      if (err) return res.status(500).send(err.toString());
      if (!form) return res.status(404).send('No form found');

      req.form = form;
      var domains = [];
      if(form.group) {
        Collection.findById(form.group)
          .exec(function(err, col) {
            if(err) return res.status(500).send(err.toString());
            if (!col) return res.status(404).send('No collection found');
            var is_admin = _.intersection(domains, req.user.admin_in).length > 0;
            var is_group_admin = _.find(req.user.group_admin_in, function(c){
              return c == col._id.toString();
            });
            // console.log(req.user.admin_in, domains, _.intersection(domains, req.user.admin_in).length, col.owner, req.user._id, req.user.group_admin_in, col._id.toString());

            Dashboard.find({_id: {$in: col.dashboards}})
              .exec(function(err, dashboards) {
                _getProjects(_.pluck(dashboards, 'domain'), is_admin || is_group_admin);
              });
          });
      } else {
        _getProjects([form.domain], req.user.admin_in.indexOf(form.domain) !== -1);
      }

  });
};

/**
 * Responses for a form
 * requires getForm before
 * TODO: permission check
 */
export const getResponses = async (req, res, next) => {
  // Find all projects where form applies
  let q = {domain: req.form.domain};
  if(req.form.group) {
    // get domains for Collection
    let collection = await Collection.findById(req.form.group)
      .populate('dashboards', 'domain')
      .exec();
    if(!collection) return res.status(404).send('No collection found');
    q.domain = {$in: _.pluck(collection.toJSON().dashboards, 'domain')};
  }
  // console.log('QUERY', q);
  //find projects with this form response
  Project.find(q)
    .select('-__v')
    .populate('leader', userPVT + ' email')
    .exec(function(err, projects) {
      if (err) return res.status(500).send(err.toString());
      if (!projects) return res.status(404).send('No projects found');

      req.responses = [];
      let form = req.form.toJSON();
      // console.log(form.questions);
      _.each(projects, function(p, i){
        p = p.toJSON();
        if(!req.user.admin_in.indexOf(p.domain)) {
          p = _.omit(p, 'email');
        }
        let resps = _.find(p.forms, function(f){
            return f.form == req.form._id.toString();
          });
        let responses = [];

        _.each(form.questions, function(question, i){
          _.each(resps && resps.responses || [], function(r){
            if(r.question == question._id.toString()) {
              responses.push(r);
            }
          });
        });

        req.responses.push({
          project: _.omit(p, 'forms'),
          responses: responses,
          responded: responses.length / form.questions.length
        });
      });
      next();
    });
};

// Get user forms
export const getForms = async (req, res, next) => {
  // if(!req.params || (!req.params.did && !req.params.cid)) {
  //   return res.status(400).send("Expected a domain or collection property");
  // }
  function _getForms(q, prjs) {
    console.log("Get Forms Query",JSON.stringify(q));
    Form.find(q)
      .select('-__v')
      .populate('creator', userPVT)
      .exec(function(err, forms) {
        if (err) return res.status(500).send(err.toString());
        if (!forms) return res.status(404).send('No forms found');
        console.log('found forms: ', _.pluck(forms, 'title'));
        req.forms = [];
        if(prjs) {
          // Restrict forms to opened with projects
          _.each(forms, function(f,i){
            f.projects = [];
            _.each(prjs, function(p){
              let isLeader = p.leader._id.toString() == req.user._id.toString();
              // Check responses permission
              if(req.method === 'GET' && !isLeader && !userAdminAndPermission(req.user, p.domain, p.group, 'form_results')) {
                console.log('Remove responses due lack of permission', p.toJSON());
                _.each(p.forms,function(_f) {
                  _f.responses = [];
                });
              }

              console.log('checking project',p.title, ' with form ', f.title, p.group, f.group);
              if(f.group && p.group.toString() === f.group.toString()) {
                console.log("Adding project due same collection", f.group, p._id, p.name);
                f.projects.push(p);
              }
              if(f.domain && p.domain.toString() === f.domain.toString()) {
                console.log("Adding project due same dashboard", f.domain, p._id, p.name);
                f.projects.push(p);
              }
            });

            // only opened forms
            if(!f.projects.length) return;
            if(!f.open) {
              // show forms already responded only
              let exists = _.find(f.projects , function(p) {
                return _.find(p.forms, function(e) {
                  return e.form.toString() === f._id.toString();
                });
              });
              if(!exists) return;
            }

            req.forms.push(f);
          });
        } else {
          // All forms (that's for admin)
          req.forms = forms;
        }
        next();
    });
  }

  var q = {};
  if(req.params.did) {
    _getForms({ domain: req.params.did }); // dashboard
  } else if(req.params.cid) {
    _getForms({ group: req.params.cid }); // collection
  } else {
    // User forms
    let q = {leader: req.user._id};
    // Forms for a project
    if(req.params.pid) q = {_id: req.params.pid};

    // Find all user projects
    //  - check for forms in its dashboard/collection
    let projects = await Project.find(q)
      .select('-__v')
      .populate('leader', userPVT)
      .populate('contributors', userPVT)
      .populate('followers', userPVT)
      .exec();
    if (!projects) return res.status(404).send('No projects found');

    // Get dashboards
    let domains = _.uniq(_.pluck(projects, 'domain'));
    let dashboards = await Dashboard.find({domain: {$in: domains}})
      .select('_id domain')
      .exec();
    if (!dashboards) return res.status(404).send('No dashboards found');
    // Find collections in this domains
    domains = _.object(_.pluck(dashboards,'_id'), _.pluck(dashboards,'domain'));
    let collections = await Collection.find({dashboards: {$in: _.pluck(dashboards, '_id')}})
      .select('-__v')
      .exec();
    if(collections) {
      _.each(projects, function(p){
        _.each(collections, function(c){
          _.each(c.dashboards, function(d){
            d = domains[d];
            // add group/collection indicator in project object
            if(d && p.domain === d) {
              p.group = c._id;
            }
          });
        });
      });
    }
    //
    _getForms({ $or: [
      { domain: {$in: _.pluck(dashboards, 'domain')}},
      { group: {$in: collections ? _.pluck(collections, '_id') : []}}
      ]}, projects);
  }
};

export const getTemplates = (req, res, next) => {
  Form.find({template: true})
    .select('-__v -projects -template -open -questions._id')
    .populate('creator', userPVT)
    .populate('group', collectionPVT)
    .exec(function(err, forms){
      if (err) return res.status(500).send(err.toString());
      if (!forms) return res.status(404).send('No templates found');
        req.forms = forms;
        next();
    });
};

const checkEditorPermisionForm = (req, res, next) => {
  const domain = req.form ? req.form.domain : req.body.domain;
  const group = req.form ? req.form.group : req.body.group;
  if(domain) {
    Dashboard.findOne({ domain: domain })
      .exec(function(err, dashboard) {
        if(err) return res.status(500).send(err.toString());
        if(!dashboard) return res.status(404).send('No dashboard found');

        if (!dashboard.open)
          return res.status(403).send("Dashboard is closed for creating projects (or forms)");

        isDashboardAdmin(req, res, next);
      });
  }
  else if(group) {
    Collection.findById(group)
      .exec(function(err, collection) {
        if(err) return res.status(500).send(err.toString());
        if(!collection) return res.status(404).send('No collection found');

        if(req.user._id.toString() === collection.owner.toString()) {
          next();
        } else {
          res.status(403).send("Only the collection's owner can create forms");
        }
      });
  }
};

export const canEditForm = (req, res, next) => {

  if(req.params && req.params.fid) {
    Form.findById(req.params.fid)
      .exec(function(err, form){
        if(err) return res.status(400).send(err.toString());
        if(!form) return res.status(404).send('Form not found');
        req.form = form;
        req.domain = form.domain;
        checkEditorPermisionForm(req, res, next);
      });
  } else if(req.body) {
    if(req.body.domain || req.body.group) {
      checkEditorPermisionForm( req, res, next);
    } else {
      return res.status(400).send("Expected a domain or collection property");
    }
  }
};

export const setForm = async (req, res, next) => {
  if(req.params && req.params.fid) {
    let form = await Form.findById(req.params.fid).exec();
    if(!form) return res.status(404).send('Form not found');
    req.form = form;
    const domain = req.form ? req.form.domain : req.body.domain;
    const group = req.form ? req.form.group : req.body.group;
    if(domain) {
      let dashboard = await Dashboard.findOne({ domain: domain }).exec();
      if(!dashboard) return res.status(404).send('No dashboard found');
      req.dashboards = [dashboard];
      return next();
    }
    if(group) {
      let collection = await Collection.findById(group).exec();
      if(!collection) return res.status(404).send('No collection found');
      let dashboards = await Dashboard.find({_id: {$in: collection.dashboards}}).exec();
      if(!dashboards) return res.status(404).send('No dashboard found');
      req.dashboards = dashboards;
      return next();
    }
  }
  res.status(400).send("Invalid form!");
};

// TODO: check collection admin
export const canRespondForm = (req, res, next) => {
  const formInDomains = _.indexOf(_.pluck(req.dashboards, 'domain'), req.project.domain) > -1;
  var isLeader = req.user._id.toString() === req.project.leader._id.toString();
  // Project leader can always reply the form
  var isAdmin = (req.project.domain && req.user.admin_in.indexOf(req.project.domain) >= 0);

  console.log(formInDomains, isLeader, isAdmin, req.user.role, userHasPermission(req.user, 'form_respond'));
  if (formInDomains && (isLeader || (isAdmin && userHasPermission(req.user, 'form_respond')))) {
    next();
  } else {
    res.status(403).send('You don\'t have permission to respond this form');
  }
};
export const createForm = (req, res, next) => {

  const form = new Form({
      title: req.body.title
    , description: req.body.description
    , template: req.body.template
    , questions: req.body.questions || []
    , created_at: Date.now()
    , creator: req.user._id
    , domain: req.body.domain
    , group: req.body.group
  });

  if (!form.title){
    return res.status(500).json({ error: "title_required" });
  }

  form.save(function(err, form){
    if(err) return res.status(500).send({error: err});
    req.form = form;

    notify('form_created', req);
    next();
  });

};

export const updateForm = (req, res, next) => {
  var form = req.form;

  const getValue = (prop) => {
    return req.body.hasOwnProperty(prop) ? req.body[prop] : form[prop];
  }

  var prev_open = form.open;
  form.title = getValue("title");
  form.description = getValue("description");
  form.questions = getValue("questions") || [];
  form.open = !!getValue("open");
  form.template = !!getValue("template");

  console.log('QUESTION UPDATE', form.toString());

  if (!form.title){
    return res.status(500).json({ error: "title_required" });
  }

  form.save(function(err, form){
    if(err) return res.status(500).send({error: err});
    req.form = form;

  if(req.body.hasOwnProperty('open') && req.body.open != prev_open) {
    if(req.body.open) {
      notify('form_opened', req);
    } else {
      notify('form_closed', req);
    }
  } else {
    notify('form_edited', req);
  }


    next();
  });
};

export const deleteForm = (req, res) => {
  // check if it's opened
  if(req.form.open) {
    return res.status(403).send('Error, please close this form before delete');
  }
  // check for responses in this form
  Project.find({'forms.form': req.form._id})
    .exec(function(err, projects) {
      if(err) return res.status(500).send('Error deleting form: ' + err);
      if(projects && projects.length) {
        return res.status(403).send('Error, this form cannot be deleted. Some projects already have responded it!');
      } else {
        var id = req.form._id.toString();
        req.form.remove(function(err) {
          if(err) res.status(500).send('Error deleting form: ' + err);
          res.status(200).json({_id: id});
        });
      }
    });
};

export const uploadFile = (req, res, next) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/uploads/forms/')
    },
    filename: function (req, file, cb) {
        var originalname = file.originalname;
        var mime = file.mimetype.split("/");
        var ext = mime[mime.length-1];
        var extension = originalname.split(".");
        if(extension.length) {
          ext = extension[extension.length-1];
        }
        var filename = req.user._id + '-' +  Date.now() + '.' + ext;
        cb(null, filename);
      }
  });

  const upload = multer({ // enables multipart/form
    storage : storage,
    limits: {
      fields: 1,
      files: 1,
      fileSize: maxUploadSize || 2097152
    }
  }).single('file');

  upload(req, res, function(err) {
    if(err) {
      return res.status(500).send('File is too big, 500 Kb is the max');
    }
    next();
  });
};

export const sendFile = (req, res) => {
  if (!req.file || req.file.fieldname !== 'file'){
    res.status(400).send( 'file field expected' );
    return;
  }

  let file = req.file;

  // if (!file.mimetype || file.mimetype.indexOf('image/') === -1){
  //   res.status(400).send({ error: 'image-mimetype-expected' });
  //   return;
  // }
  let url = file.path.replace('public/', '/');
  // Save in project response
  // Fake the response to save it
  req.body = req.body || {};
  req.body.form = req.form._id;
  req.body.responses = [{
    question: req.params.qid,
    value: {
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      path: url
    }
  }];
  // console.log(req.body.responses);
  saveResponse(req, res, function() {
    res.send({ href: url });
  });
};

export const deleteFile = (req, res) => {
  if (!req.body.file){
    res.status(400).send('Error, expecting a file property to delete.');
    return;
  }

  fs.unlink(__dirname + '/../../../../../public' + req.body.file.path, function(err) {
    if(err) {
      res.status(500).send('Error deleting file: ' + err);
    }
  });
  // Save in project response
  // Fake the response to save it
  req.body.form = req.form._id;
  req.body.responses = [{
    question: req.params.qid,
    value: null
  }];
  saveResponse(req, res, function() {
    res.status(200);
  });

}

export const saveResponse = (req, res, next) => {

  if(!req.body || !req.body.form || !req.body.responses) {
    return res.status(500).send('Data required');
  }
  if(!req.form.open) {
    return res.status(403).send('This form is closed');
  }

  try {
    req.project.forms = req.project.forms || [];
    var preform = _.find(req.project.forms, function(el) {
        return el.form.toString() === req.form._id.toString();
      });
    var pform = preform ? preform : {form: req.form._id, responses: []};
    // console.log('project-form', pform.toString());
    _.each(req.body.responses, function(r) {
      // console.log('response',r);
      let q = req.form.questions.id(r.question);
      // console.log('question', q.toString());
      if(q) {
        let saved = false;
        _.each(pform.responses, function(el){
            if(el.question.toString() === r.question.toString()) {
              // console.log('previous answer', el.toString());
              _.extend(el, r);
              // console.log('new answer', el.toString());
              saved = true;
            }
          });
        if(!saved) {
          pform.responses.push(r);
        }
      }
    });
    if(!preform) {
      req.project.forms.push(pform);
    }
    // console.log('RESULT', pform.form, pform.responses, req.project.forms.toString());
    req.project.save(function(err, project){
      if(err) return res.status(500).send(err);
      req.response = pform;
      // console.log('SAVED', project.forms);
      next();
    });
  } catch(e) {
    console.log('catched error',e);
    res.status(500).send('Error saving response! ' + e);
  }
};

export const sendResponses = (req, res, next) => {
  if(req.query.hasOwnProperty('csv')) {
    // console.log('FORMATTING CSV Responses', req.form.title);
    const headers = ['userId', 'name', 'e-mail', 'projectID', 'project', 'dashboard', 'form', 'question', 'type', 'response'];
    const format = (q, value) => {
      if(_.isEmpty(value)) {
        return '';
      }
      if(q.type == 'file') {
        return value.path ? publicHost + value.path : '';
      }
      return value;
    };
    res.setHeader('Content-disposition', `attachment; filename="RESPONSES - ${req.form.title}.csv"`);
    res.contentType('csv');

    let data = [headers];
    req.responses.forEach(({project, responses}) => {
      req.form.questions.forEach((q) => {
        let r = _.find(responses, (re) => re.question.toString() == q._id.toString()) || {};
        const resp = [project.leader.userId, project.leader.name, project.leader.email, project.projectId,  project.title, project.domain, req.form.title, q.title, q.type, format(q, r.value)];
        data.push(resp);
      });
    });
    let csv = new CSV(data);
    res.write(csv.encode());
    res.end();

  }
  else if(req.query.hasOwnProperty('zip')) {
    var name = '/uploads/export/'+ slug(req.form._id+' '+req.form.title)+'.zip';
    if(fs.existsSync(__dirname + '/../../../../../public' + name)) {
      return res.redirect(name);
    }
    var cmd = 'node scripts/forms.js -f ' + req.form._id;

    exec(cmd, function(error, stdout, stderr) {
      // command output is in stdout
      if(error) {
        return res.status(200).send(error+' '+stderr);
      }
      return res.redirect(name);
    });
    // res.status(500).send('Not found ZIP ('+ name + ') for this form');
  } else {
    res.send(req.responses);
  }
};

export const sendResponse = (req, res, next) => {
  res.send(req.response);
};

export const sendForm = (req, res, next) => {
  res.send(req.form);
};

export const sendForms = (req, res, next) => {
  res.send(req.forms);
};

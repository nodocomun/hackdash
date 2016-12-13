Wotify dashboards
========

Organize hackaton ideas into a dashboard

![HackDash Logo](http://i.imgur.com/XLQGF3y.png)

![Wotify Logo](https://wotify.co/images/mini-logo-wotify.png)

Special version suited for the [Europeana Wotify Dashboards](https://wotify.co)

Install
===========

This is a heavily modified fork of [hackdash](https://github.com/danzajdband/hackdash) to convert this originally showcase style web to a workin tool.

Some of the changes introduced are:

- Allowing different themes by overwriting **.hbs** or **.less** files.
- Added a complex Form creator tool by the dashboards admins to make leaders respond questions during the hackaton.
- Login by email and google added.
- Added more configuration options for dashboards (for example a private mode prevents projects in that dashboard to appear publicly in the web).
- Notifications by email works.

Config
======

You can copy the sample data and edit your values:

```bash
cp config/config.json.sample config/config.json
```

In this copy of hackdash, **statuses** can be customized, you need to create a copy of statuses.json inside the config folder as well. Use the sample as default:

```bash
cp config/config.json.sample config/config.json
```

In your `config/config.json`:

* `db`:
	+ `url`: Overrides other db config. Full MongoDB URL.
	+ `host`
	+ `port`
* `host`: Your instance host (i.e. yourdomain.com)
* `port`: Your port (i.e. 3000)
* `session`: Your session key (it must be a secret string)
* `title`: Instance title used in the html title tag and other headings.
* `live`: Boolean (true, false) that enable/disable the live feed feature in yourdomain.com/live.
* `mailer`: SMTP mail info to enable email notifications using nodemailer. Check out the [options](https://github.com/andris9/Nodemailer#setting-up-smtp)
* `mailerFrom`: "Some name <noreply@example.com>" REQUIRED if mailer is used, this is the default from used in email comunications
* `team`: An array of `user`.`_id` to be shown as Team on Landing Page.
* `maxQueryLimit`: a Number for the max amount of results at the landing page searchs.
* `googleAnalytics`: the UA-XXXXXXXX-X code from Google Analytics. if not specified wont set the script.
* `googleApiKey`: The Google Maps API Key for geolocation purposes
* `facebookAppId`: the Facebook App Id for share buttons. It will take first from keys.json, if not will use this one. Don't set it to not show FB share buttons.
* `prerender`:
	+ `enabled`: Boolean (true, false). Where the website would use the SEO Prerender
	+ `db`: The Mongo URI of Cached Pages.

Added vars for Wotify Dashboards:

* `publicHost`: and alternative public host can be specified here (used in several links to return home, i.e: **wotify.co**). This is useful in case you run your node app behind a proxy in a different port than 80 (Please specify protocol (http://example.com or better https://example.com).
* `publicDashboardCreation` : a boolean to specify if dashboards can be created by anyone or just the users marked as "superadmin"
* `homeCreateProject` : Set it to true in order to show a button in the front page to create projects
* `homeToolsUrl` : Set it to some URL ("http://...") in order to show a button in the front page with a link to it
* `useLocalLogin`: Set to true if you want to allow username/password registration
* `theme`: This allows to apply a custom themes to hackdash. Just put a `theme_name` with the same folder name inside `themes/theme_name`. Styles or hbs templates can be overwritten. (Look at the code inside themes for an example).
* `language`: If `null` autodetects from user's browser settings. Otherwise specify a valid lang to force Hackdash to that lang (ie: `en`, `es`)


Login keys setup
=================

Logins are only available through 3 th party services. You'll need to create Apps and obtain the secrets from those services (currently Twitter, Facebook, Github and Google).
We've added Google login tot the keys.

User the keys.json.sample as an example. Google login uses Oauth2.0 version.

```bash
cp config/keys.json.sample config/keys.json
```

Local login (traditional username/password) can be added by setting `"useLocalLogin": true` in `config.js`

Init test server
=================

```bash
npm start
```

Generate Client scripts
=================

This step is necessary if you make changes in the CSS or the client code (folder `client`)

```bash
cd client
grunt
```

For convenience, both can be started at the same time:

```bash
npm run devel
```

If using themes, theme must be compiled in grunt as well. Theme is readed from
configuration `config/config.json`. Grunt task also accepts a `--config` option
to compile using a different config file (useful if you are working in more than
one theme).

```bash
cd client
grunt --config ../config/config.json
```

Generating collections
=================

```bash
node scripts/collections.js
```

Managing users
=================

Superadmin has been introduced, currently landing page only show the create dashboard to superadmins.

Create superadmins with:

```bash
node scripts/users.js
```

Contribute
==========

The original [wiki guide is here](https://github.com/danzajdband/hackdash/wiki) (hopefully):

Feel free to make contributions to this copy of Hackdash if somehow is useful for you.

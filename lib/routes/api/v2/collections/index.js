
/*
 * RESTfull API: Collection Resources
 */

import cors from 'cors';
import {Router} from 'express';
import {isAuth,isCollectionAdmin} from 'lib/routes/api/v2/helpers';
import {setQuery, getAllCollections, sendCollections, getUserCollections,
createCollection, getCollection, isOwner, updateCollection, removeCollection,
addDashboard, removeDashboard, sendCollection} from './controllers';

/**
 * Create and expose router
 */

const app = Router();
export default app;

/**
 * Define routes
 */

// Get & Search all collections
app.get('/collections', cors(), setQuery, getAllCollections, sendCollections);

// Get user collections
app.get('/collections/own', getUserCollections, sendCollections);

// Create a user collection
app.post('/collections', isAuth, createCollection, sendCollection);

// Get a collection
app.get('/collections/:cid', cors(), getCollection, sendCollection);

// Update a user collection
app.put('/collections/:cid', isAuth, getCollection, isCollectionAdmin, updateCollection);

// Delete a user collection
app.delete('/collections/:cid', isAuth, getCollection, isOwner, removeCollection);

// Add dashboard to a collection
app.post('/collections/:cid/dashboards/:did', isAuth, getCollection, isCollectionAdmin, addDashboard);

// Remove dashboard from a collection
app.delete('/collections/:cid/dashboards/:did', isAuth, getCollection, isCollectionAdmin, removeDashboard);

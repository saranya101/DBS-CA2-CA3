# DBS Practical

## Setup

1. Clone this repository
https://github.com/soc-DBS/dbs-assignment-saranya101


2. Create a .env file with the following content

    ```
    DB_USER=
    DB_PASSWORD=
    DB_HOST=
    DB_DATABASE=
    DB_CONNECTION_LIMIT=1
    PORT=3000
    ```

3. Update the .env content with your database credentials accordingly.

4. Install dependencies by running `npm install`

5. Start the app by running `npm start`. Alternatively to use hot reload, start the app by running `npm run dev`.

6. You should see `App listening on port 3000`

8. (Optional) install the plugins recommended in `.vscode/extensions.json`

## Instructions

Open the page, `http://localhost:3000`, replace the port number accordingly if you app is not listening to port 3000



Favourite and Review Management System
This project includes various functionalities for managing favourite lists, reviews, and member spending in a web application. The key functionalities covered are:

Favourite Management

1. List Management
- Create List
- View All Lists created
- Add products into the lists that you want 
- View all the products in a specific list 
- Remove product from list 
- Update name of list 
- Delete list 

TO CREATE A LIST:
1. Navigate to the products tab
2. Click show all products
3. Click add to favourites
4. There is a place to create lists 

TO ADD TO LIST:
1. Choose what product you want inside in your list
2. Click add to favourites for that 
3. Choose which list you would like to put it in
4. After done selecting, click add to favourite 

TO VIEW ALL LISTS CREATED:
1. Navigate to the Favourite tab
2. You can see all the lists created 

TO VIEW ALL THE PRODUCTS IN A LIST:
1. Click the View button on the list of your choice 

TO REMOVE PRODUCT FROM LIST:
1. Click on view
2. Navigate to the remove from list button and click

TO UPDATE LIST NAME:
1. Navigate back to the page 'http://localhost:3000 favourite/' 
2. Click on the update button 

TO DELETE LIST NAME:
1.  Navigate back to the page 'http://localhost:3000 favourite/' 
2. Click on the delete button 


2. Review Management

CREATE REVIEW:
1. Navigate to the Review tab
2. Click on the create review 
3. Select on which product you want a write a review for 
4. Ensure that all the params are filled 

RETRIEVE ALL REVIEWS:
1. Navigate to the Review tab
2. Click on the Retrieve All My Reviews

RETRIEVE SPECIFIC REVIEW:
1. Choose which review you want to see 
2. Click on the View More Button

UPDATE REVIEW:
1. Choose which review you want to update
2. Click on the Update Button
3. Fill up the necessary details
4. Click the update button 

DELETE REVIEW:
1. Navigate to the page 'http://localhost:3000/review/retrieve/all/'
2. Press on the delete button for the wanted review 
3. Ensure you are deleting the right review and press delete 
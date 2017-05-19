# Documentation: CollectOnline API

## Installation:
***Note: This api requires nodejs installation with npm***

`npm install`

## config:
Edit the config.json:
-----
|  property | defaultValue | possible values |
|---|---|---|---|---|
|  port | 65000 | Any Int <= 65000|
| hostname  | localhost | Any String |
| logLevel  | INFO | "ALL", "TRACE", "DEBUG", "INFO", "WARN", "ERROR" |
| aspiration.type  | none | "fork" / "none" |
| aspiration.interactive  | true | true / false |

## starting:
### using forever (production mode)
`./CollectOnline start`

***Note: there is status and stop command into the ./CollectOnline startup script***
***This script requires forever installed***

### using native node (dev mode)
`npm start`

---
## Usage of the api
### __Request a data update  of a given product__



* **URL**: `_/api/update_`
  * **Method:** `POST`
    * **Required arguments:**
      * Enseigne  = [the script name]  `example : 'Bricoman'`
      * `MagasinId = [integer]`
      * `idProduit = [product or variant ID]`
      * `url       = [product url]`

    * **Example of data params**
    	JSON object

    ```json
    {
      "Enseigne":"Bricoman",
      "MagasinId":"1",
      "idProduit":"519260",
      "url":"https://www.bricoman.fr/porte-de-garage-sectionnelle-motorisee-blanche-h200xl300.html"
    }
    ```
  * **Example of success response:**
    * **Code:** 200 <br />
    * **Content:**
    ```json
    {
      "requestID": 1,
      "requestDate": 1491573656648,
      "responseDate": null,
      "Enseigne": "Bricoman",
      "MagasinId": "1",
      "idProduit": "519260",
      "url": "https://www.bricoman.fr/porte-de-garage-sectionnelle-motorisee-blanche-h200xl300.html",
      "status": "pending",
      "data": {}
    }
    ```

  * **Error Response:**

     * **Code:** 400 Bad Request <br />
     * **Content:**

      ```json
        {
        "Error": "a valid query must be a JSON that contains: Enseigne, MagasinId, idProduit and url"
        }
        ```
---
### __Check the data of a given Request__

* **URL** `_/request/:id_`
  * **Method:** `GET`
    * **Required:** `id = [Integer]`
    * **Success Response:**
      * **Code:** 200
      * **Content:**
        ```json
        {
          "requestID": 1,
          "requestDate": 1491573656648,
          "responseDate": 1491573658784,
          "Enseigne": "Bricoman",
          "MagasinId": "1",
          "idProduit": "519260",
          "url": "https://www.bricoman.fr/...he-h200xl300.html",
          "status": "set",
          "data": {  "enseigne": "Bricoman",
        			    "magasin": "01600 Massieux",
        			    "magasinId": "1",
        			    "categories": [
        				      "Menuiserie extérieure",
        				      "Portes de garage",
        				      "Portes de garage"
        				  ],
        			    "marque": "",
        			    "srcImage": "https://www.bricoman.fr/me60_11ml.jpg",
        			    "libelles": [
        				      "PORTE DE GARAGE 200XL300"
        				  ],
        			    "idProduit": "519260",
        			    "ean": "3760193164046",
        			    "prix": "769,00 €TTC",
        			    "prixUnite": "769,00 € / Unité",
        			    "timestamp": 1491573658762,
        			    "promo": 0,
        			    "promoDirecte": 0,
        			    "dispo": 1
        			}
        	}
        ```

    * **Error Response:**

       * **Code:** 404 Not Found <br />
        **Content:**

    ```json
        {  "Error": "the requested ID, doesn't exists"}
    ```
---
### __Delete the data of a given Request__

  * **URL** `_/drop/:id_`
    * **Method:** `DELETE`
    * **Required:** `id = [Integer]`
    * **Success Response:**
      * **Code:** 200
      * **Content:**
      ```json
      {
        "deleted": "0",
        "bufferLength": 7
      }
      ```
    * **Error Response:**
       * **Code:** 404 Not Found
       * **Content:**
        ```json
            {"Error":"a valid ID must be choosen"}
        ```

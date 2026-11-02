### Which vulnerability was found?

A05: Injection

An injection attack is when, through a flaw in the application, a user is able to send commands through an input to an interpreter which then interprets the input as a command and executes it.

### How to reproduce the vulnerability

Simple method:

1. Type a common injection payload into the email field, like `' OR TRUE--`
2. Enter at least one character into the password field.
3. Click login

Use Burp Suite (free community edition) to attempt SQL injection with a list of common payloads.

1. Open Burp Suite and navigate to the Proxy tab
2. Open a Burp Suite browser instance
3. Navigate to localhost:3000 (or whichever port Juice Shop is running on)
4. Click the HTTP history tab to view requests to the server
5. In the Burp browser, attempt to login with any credentials.
   - The goal is just to find the POST packet sent to the server and get information about how login is handled.
6. Right click the POST login packet and select 'Send to Intruder'.
7. In the Intruder tab, select Sniper attack.
   - Sniper is a fuzzing method that places a single payload from a list into a specified input field.
   - The input field we test here is email.
   - Sniper tests each input from the list in that field.
8. Find a list of payloads online.
   - Verify it's just a list and won't run a payload on yourself.
9. Under payload configuration, load the list and uncheck 'URL-encode these characters'.
10. Start an attack.
    - A new window will open with results.
    - Burp sends the server a packet with each payload and shows the responses.
11. Status code is the column we are interested in.
    - 500 indicates a server error.
    - 200 on a payload indicates the bypass worked. The server returned an auth token for credentials that should have been rejected.
    - 401 indicates the request lacks valid authorization credentials (a normal rejected login).
12. The server responds with either an error, a rejection, or an authentication token (success).
13. The results show every payload that worked to log in to Juice Shop.


![The POST packet sent to the server with invalid login credentials that returned a 401 response.](images/invalid-credentials.png)
![List of results from each payload](images/payload-results.png)

### Explanation of the root cause

Code in routes/login.ts in the login function is the root cause of this injection vulnerability.

The vulnerable code is found in the routes/login.ts file, within the login function. The root cause is a string literal breakout. User entries from the login fields are concatenated directly into the SQL query, which can be seen on line 34 in the screenshot below.

How the payload `' OR 1=1--` exploits this:

- `'` closes the first quote and breaks out of the string literal. Anything after it is SQL that I'm writing and injecting instead of the data.
- `OR 1=1` is true for every row, so the server returns the entire table of users.
- The app takes the first row of whatever comes back and treats it as an authenticated user. Admin has the lowest ID and occupies the first row on the table, so we log in as the admin.
- `--` comments out the rest of the statement, removing anything after it on that line. This removes the password check.


![Vulnerable code in the login function](images/code-flaw.png)


### How to fix this issue

To prevent against SQL Injection, OWASP recommends replacing the string-concatenated query with Sequelize's built in binding/replacement mechanism, which is equivalent to creating a prepared statement. This was chosen because it prevents tampering with the query syntax through user input. The query structure is set before the user supplied parameters (email and password) are inserted, so the input is treated as data and never as SQL code.

### Fix process/implementation

Changed the login query in routes/login.ts from string concatenation to a parameterized query. The email and password are now passed as bound parameters ($1 and $2) through using Sequelize's bind option instead of being interpolated into the query string.

### Verification of fix

Running the Burp Suite process against the rebuilt container on localhost:3001 returns 401 for injection payloads. Logging in with a registered account still returns 200 and an authentication token.

![401 response with attempted SQL injection](images/fixed-injection-attempt.png)

![200 response with valid credentials and authentication token](images/valid-login.png)

### Potential improvements

This fix only patches one instance of the problem. The next step would be finding any other areas within the program with the same flaw and patching them similarly. Minimizing privileges on the database account by running the app's DB connection under an account with only the permission it needs (like read/write on the tables it uses but no admin rights or ability to change schema) would limit the damage someone can do with an injection.

### References

https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

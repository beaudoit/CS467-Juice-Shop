# Password Hash Vulnerabilities

## Which vulnerability was found?

I found multiple related vulnerabilities that collectively enabled a user to exfiltrate password hashes and recover the original plaintext passwords:

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
The Juice Shop web app exposes a REST API endpoint “/rest/user/whoami” for querying certain attributes of the currently authenticated user. This is utilized for displaying the current user’s email, profile picture, etc. in various interfaces. However, the web app doesn’t restrict which attributes may be queried, which allows a user to query sensitive attributes they shouldn’t have access to, such as the password hash.

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
The Juice Shop web app exposes a REST API endpoint “/rest/products/search” with a parameter q that is inserted into SQL queries. This is utilized for filtering queries to search for specific products in the SQL database. However, the parameter q is directly concatenated into the SQL query instead of being safely parameterized, which allows a user to craft and deliver SQL queries via the REST API, enabling them to query any database tables (including querying all passwords from the Users table).

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
The Juice Shop web app utilizes MD5 for hashing and storing passwords. MD5 is an outdated, vulnerable hashing algorithm because it is fast and doesn’t vary output using salts, making it susceptible to brute-force, dictionary, and rainbow table attacks. If a user is able to exfiltrate an MD5 password hash, then they could recover or “crack” the corresponding plaintext password relatively easily.

## How to reproduce the vulnerability

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
1. Monitor network traffic using Inspect/Developer Tools while navigating around the web app. Create a user account and log in. Notice that the web app makes an API call to the following URL: localhost:3000/rest/user/whoami?fields=email 
(See screenshot monitor-traffic-during-login.png)
2. Access the REST API endpoint directly by visiting the same URL: localhost:3000/rest/user/whoami?fields=email 
(See screenshot test-whoami-api-call.png)
3. Modify the URL to try calling the API with other commonly named user attributes, such as password: localhost:3000/rest/user/whoami?fields=password
Notice that the web app returns the current user’s password hash.
(See screenshot call-whoami-api-for-password.png)

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
1. Monitor network traffic using Inspect/Developer Tools while using the product search bar. Notice that the web app makes an API call to the following URL: localhost:3000/rest/products/search?q=
(See screenshot monitor-traffic-during-search.png)
2. Access the REST API endpoint directly by visiting the same URL: localhost:3000/rest/products/search?q= 
(See screenshot test-product-api-call.png)
3. Modify the parameter q to attempt SQL injection. For example, try: localhost:3000/rest/products/search?q=’-- 
Notice that the web app returns SQL errors, confirming that SQL injection is possible but that the format isn’t correct. Continue modifying until you get a successful response. For example, try: localhost:3000/rest/products/search?q=’))--
Notice that all product entries are returned from the Products table.
(See screenshots attempt-sql-injection.png and get-successful-sql-response.png)
4. Continue modifying the parameter q and adding additional SQL queries to test the extent of SQL injections possible. For example, try: localhost:3000/rest/products/search?q=’)) ORDER BY name DESC--
Notice that all product entries are returned from the Products table, but in reverse order.
(See screenshot query-products-reverse-order.png)
5. Now attempt to query other tables. Guess other tables by commonly used names, such as Users. Notice that the SQL errors that get returned will differ based on whether or not you correctly guessed a table name. For example, try the following two URLs and notice the difference in error responses:
localhost:3000/rest/products/search?q=XXXX’)) UNION SELECT FROM x--
localhost:3000/rest/products/search?q=XXXX’)) UNION SELECT FROM Users--
(See screenshots attempt-query-other-table.png and attempt-query-users-table.png)
6. Now attempt to successfully query the Users table by guessing the correct number of columns. For example, try:
q=XXXX')) UNION SELECT '1' FROM Users--
q=XXXX')) UNION SELECT '1', '2' FROM Users-- 
…
q=XXXX')) UNION SELECT '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' FROM Users--
Notice that you get a successful SQL response when the number of columns is 10.
(See screenshot find-correct-number-columns.png)
7. Replace any number of the column number placeholders with specifically named fields that you want to access. For example, try:
q=XXXX')) UNION SELECT email, password, '3', '4', '5', '6', '7', '8', '9', '10' FROM Users--
Notice that the response includes all users’ email addresses and password hashes.
(See screenshot query-all-emails-passwords.png)

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
1. Once you’ve exfiltrated a password hash, you can use various software tools or online tools to identify the hashing algorithm and attempt to “crack” it through brute force, dictionary, or rainbow table attacks. For example, visit a free online tool for cracking common outdated/insecure hashes at: hashes.com/en/decrypt/hash
2. Enter a password hash that you’ve exfiltrated, such as the hash for the admin@juice-sh.op account: 0192023a7bbd73250516f069df18b500
Select “Show algorithm of founds”, and submit the request.
3. See the hashing algorithm that was used and the corresponding plaintext password. Notice that all hashes from the Juice Shop web app are identified as MD5 and can be reliably cracked using hashes.com or other similar tools.
(See screenshot crack-admin-password.png)

## Explanation of the root cause

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
The rest/user/whoami API endpoint permits queries of any attributes of the user model, which include some that are necessary for web app functionality (id, email, profileImage, etc.) and some that are unnecessary and/or potentially sensitive (such as password, totpSecret, etc.). 

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
The rest/products/search API endpoint accepts a parameter q, which it directly inserts into SQL queries using interpolation without any sanitization or parameterization.

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
The web app uses MD5 as its hashing algorithm for storing passwords. MD5 is known to be an outdated, insecure hashing algorithm because it is too fast and doesn’t use a salt to vary outputs.

## How to fix this issue

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
There should be an allowlist of which user model attributes are permitted to be queried via the rest/user/whoami API endpoint (namely, only the attributes that are strictly required web app functionality: id, email, profileImage, lastLoginIp). This would prevent users from accessing sensitive user model attributes, such as password.

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
The parameter q should not be interpolated directly into the SQL query. Instead, it should be parameterized so that it is inserted separately from the SQL query structure (the parameter q should always be treated as a string and never as part of the SQL query structure). This would prevent users from manipulating the SQL query for other purposes.

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
Passwords should never be hashed and stored using the MD5 hashing algorithm. Instead, a secure web app should only hash and store passwords using a slow hashing algorithm that incorporates salts to vary output, such as Agron2id, bcrypt, or PBKDF2.

## Fix process/implementation

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
I modified the file routes/currentUser.ts to add an allowlist of the specific user model attributes that should be permitted to be queried in API calls (id, email, lastLoginIp, profileImage).
(See modified code in the pull request: Fix/whoami-api-password-hash-leak by beaudoit · Pull Request #20 · beaudoit/CS467-Juice-Shop)

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
I modified the file routes/search.ts to parameterize the user input (q parameter) using the Sequelize bind mechanism.
(See modified code in the pull request: Fix/product-search-api-sql-injection by beaudoit · Pull Request #22 · beaudoit/CS467-Juice-Shop)

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
I modified the file lib/insecurity.ts to import and utilize the argon2 library for hashing passwords using the Argon2id algorithm. I added a helper function for hashing passwords using Argon2id, and I added a helper function for verifying Argon2id hashes. I then modified other files (including models/user.ts, routes/login.ts, and routes/changePassword.ts) to utilize the new Argon2id functions. Meanwhile, I maintained the existing MD5 hashing function to support legacy passwords.
(See modified code in the pull request: Fix/password-hashing-algorithm by beaudoit · Pull Request #19 · beaudoit/CS467-Juice-Shop)

## Verification of fix

### A. Exfiltrating current user’s password hash via REST API (A02:2025 – Security Misconfiguration)
After implementing the fix described above, I visited the URL localhost:3000/rest/user/whoami?fields=password to confirm that the API returns nothing if the user attempts to access a non-allowed attribute, such as password. Then I visited the URL localhost:3000/rest/user/whoami?fields=email to confirm that the API still pertmits access to some allow-listed attributes, including email.

### B. Exfiltrating all users’ password hashes via SQL injection (A05:2025 – Injection)
After implementing the fix described above, I retried the previously successful URL with a REST API call and SQL injection payload: localhost:3001/rest/products/search?q=XXXX')) UNION SELECT email, password, '3', '4', '5', '6', '7', '8', '9', '10' FROM Users—
I confirmed that this and other related SQL injection queries now return no data. Then I tested the web app’s search bar again to ensure that I didn’t interfere with regular functionality.

### C. Recovering plaintext passwords through dictionary or rainbow table attacks on MD5 hashes (A04:2025 – Cryptographic Failures)
After implementing the fix described above, I retrieved all users’ password hashes (temporarily using the exfiltration vulnerabilities mentioned previously) and confirmed that they were now all hashed using the Argon2id algorithm (which is apparent from the format and header). Then I attempted to use online tools, such as hashes.com, to crack several of the Argon2id hashes. I confirmed that none of the Argon2id hashes could be cracked using these common methods, due to their more secure salting and slow hashing.

## Potential improvements
The test suites provided by OWASP for the Juice Shop web app test both regular functionality and insecure functionality. That is, they test that the web app functions as a regular shopping web app should (search, login, navigation, etc.), but they also test that the web app provides deliberately insecure functionality for security training purposes (SQL injection, XSS vulnerabilities, etc.).

Therefore, as I mitigated vulnerabilities through code fixes, I caused some of the tests to fail because the insecure functionality no longer worked as OWASP original designed it. Our team decided to continue using these provided test suites so that we could continue to reference the results from the regular functionality tests, but we accepted that some of the tests would fail and that we would need to manually review all failed test results to ensure only the insecure functionality tests failed. 

In the future, I could make improvements to the test suite so that my code fixes that mitigate the password hash vulnerabilities don’t incidentally cause any tests to fail. That is, I could modify all the relevant tests so that they expect different outcomes. For example, for the tests that confirm the functionality of the rest/user/whoami API endpoint, I could modify them to expect that no data gets returned when the password attributed is queried, instead of expecting the password hash to be returned. In that way, our team could still utilize the provided test suites but adapt them to expect more secure functionality as we mitigate vulnerabilities. 

## References
Microsoft, "Microsoft Copilot," Microsoft. [Online]. Available: https://copilot.microsoft.com/. Used for additional research, troubleshooting, and proofreading.

OWASP Foundation, "SQL Injection Prevention Cheat Sheet," OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html.

OWASP Foundation, "REST Assessment Cheat Sheet," OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/REST_Assessment_Cheat_Sheet.html.

OWASP Foundation, "REST Security Cheat Sheet," OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html.

OWASP Foundation, "Password Storage Cheat Sheet," OWASP Cheat Sheet Series. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html.

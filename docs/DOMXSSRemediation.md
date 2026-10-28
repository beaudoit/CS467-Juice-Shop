# DOM-Based Cross-Site Scripting (XSS) Remediation

## Which vulnerability was found?

A Cross-Site Scripting attack is a possibility when a website does not “sanitize” input from users. What is meant by that is, the website does not remove or neutralize potentially dangerous content before the browser interprets it. If an attacker puts certain JavaScript commands into, in this instance a search bar, those commands can be executed on the web page. This allows an attacker to execute unauthorized JavaScript, which could compromise user information or manipulate the website’s behavior.

When an application has a search bar and a user inputs something into Juice Shop’s search bar, the query becomes part of the URL. What Juice Shop did was take that query from the URL and run it through a function called bypassSecurityTrustHtml(), which told Juice Shop’s front-end program, Angular, to trust any input as safe HTML. This allowed the application to insert the HTML into the web page, which then executed the malicious JavaScript.

OWASP Top 10:2025 – A05 Injection


## How to reproduce the vulnerability

If a person were going to reproduce this attack on the Juice Shop application they would have to use a platform like Docker to open the program. Juice Shop would be opened on the local host machine, in my instance it was http://localhost:3000. There is a search bar where a malicous JavaScript could be entered as a search query. The search query I used was `<img src=x onerror=alert('XSS')>`. When I submitted the search query an alert box was triggered on the web page which should not have happened.

Steps to Reproduce the DOM XSS Vulnerability

1. Start the original, vulnerable version of OWASP Juice Shop using Docker.

2. Open a web browser and navigate to `http://localhost:3000`.

3. Locate the search icon at the top of the Juice Shop homepage and click it to open the search bar.

4. Enter the following payload into the search bar:

   `<img src=x onerror=alert('XSS')>`

5. Press **Enter** to submit the search query.

6. Observe the JavaScript alert window displaying the text `XSS`. This demonstrates that the application executed JavaScript supplied through the search query.

7. Close the alert window. The search results page will display the submitted query.

Expected Result: The application should treat the search query as untrusted input and prevent JavaScript from executing.

Actual Result: The vulnerable application executes the JavaScript embedded in the search query, triggering an alert window.

![XSS alert triggered by Juice Shop search](ExecutingJavaFromSearchBar.png)


## Explanation of the root cause

The root cause of this vulnerability is a function that allows the query to bypass Angular's HTML sanitization. Code file page in the Juice Shop program is called search-result.component.ts.  There is a function in that file on line 146 called filterTable() which calls on this line, `this.searchValue = this.sanitizer.bypassSecurityTrustHtml(queryParam)` to allow the query to be treated as trusted content.


## How to fix this issue

This was a fairly easy and straitforward fix. I removed the `this.sanitizer.bypassSecurityTrustHtml(queryParam)` and replaced it with `queryParam`. This would allow the normal built-in protections to sanitize the input when displaying the search results while preventing malicious JavaScript from executing.

Steps to Fix the DOM XSS Vulnerability

1. Open the OWASP Juice Shop project in Visual Studio Code.

2. In the Explorer panel, navigate to the following file:

   `frontend/src/app/search-result/search-result.component.ts`

3. Open `search-result.component.ts` and locate the `filterTable()` function.

4. Within that function, find the following line of code:

   ```typescript
   this.searchValue = this.sanitizer.bypassSecurityTrustHtml(queryParam)
   ```

5. Remove `this.sanitizer.bypassSecurityTrustHtml(queryParam)` and replace it with `queryParam`. The corrected line should read:

   ```typescript
   this.searchValue = queryParam
   ```

6. Save the file. This removes the explicit bypass of Angular's built-in HTML sanitization, allowing Angular to sanitize the search query when it is rendered.

7. Rebuild and restart the modified Juice Shop application so that the updated code is used.

8. Open the modified application in a browser and enter the same XSS payload used to reproduce the vulnerability:

   `<img src=x onerror=alert('XSS')>`

9. Verify that the search query no longer triggers a JavaScript alert.

10. Perform a normal product search, such as `apple`, to confirm that the search functionality still works.

**Expected Result:** The search query is displayed without executing the embedded JavaScript, and normal product searches continue to function.

Another option would have been to change the HTML file to display the search query as plain text instead of HTML, which would prevent the browser from executing the malicious code.


## Fix process/Implementation

I removed the original code that bypassed the sanitizer:
![Original code](rawCode.png)

and replaced it with just the parameter:
![Fixed Code](fixedCode.png)

Commit: https://github.com/beaudoit/CS467-Juice-Shop/commit/bfc08d822


## Verification of the fix

Before the fix an alert window opened with the text I placed into the query:
![XSS alert triggered by Juice Shop search](ExecutingJavaFromSearchBar.png)

After the fix there was no alert and the query was displayed correctly:
![After the fix there was no alert window](ExecutingHTMLFromSearchBar.png)

After applying the fix, I also searched for a known product using the term `apple` and confirmed that the search functionality worked as expected.


## Potential Improvements

Regression Testing: An automated test could run whenever code changes are submitted to ensure the XSS vulnerability has not been reintroduced. If the vulnerability returns, the test would fail and notify developers.

Review for similar code: A search of the entire directory could reveal other places where `bypassSecurityTrustHtml()` is used. Each instance could be reviewed to determine whether bypassing the built-in protections is necessary and safe.


## References

OWASP. OWASP Top 10:2025 — A05 Injection. https://owasp.org/Top10/2025/A05_2025-Injection/

OWASP. DOM Based XSS Prevention Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html

Angular. DomSanitizer API Documentation. https://angular.dev/api/platform-browser/DomSanitizer

OWASP. Juice Shop GitHub Repository. https://github.com/juice-shop/juice-shop

OpenAI. (2026). ChatGPT (GPT-6). Used for technical explanations, troubleshooting, and proofreading.
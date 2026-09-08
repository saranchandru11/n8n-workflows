# Setup Guide — adding the knowledge base to your triage workflow

Follow this top to bottom. It takes about 20 minutes. Nothing here can break your existing
workflow, because we import the new one as a **separate copy**.

If you get stuck at any step, note the step number and ask — that's enough for me to help.

---

## Before you start

You need two files from your GitHub repo. Both are in the `it-support-ticket-triage` folder:

| File | What it is |
|---|---|
| `knowledge-base/it-knowledge-base.csv` | The 10 IT instruction sheets |
| `IT Support Ticket Triage with RAG.json` | The updated workflow |

**How to download them:**

1. Go to your repo: <https://github.com/saranchandru11/n8n-workflows>
2. Switch to the branch **`arena/01a07d35-n8n-workflows`** (there's a branch dropdown button near
   the top left that probably says `main` — click it and pick that branch)
3. Click into the `it-support-ticket-triage` folder
4. Click a file, then click the **Download raw file** button (the ⤓ icon, top right of the file view)
5. Do this for both files

Save them somewhere you'll find them again, like your Downloads folder.

---

# STEP 1 — Put the knowledge base into Google Sheets

**What you're doing:** creating the "folder of instruction sheets" your workflow will look things up in.

1. Go to <https://sheets.google.com>
2. Click the **+ Blank spreadsheet** tile
3. At the top left, click **Untitled spreadsheet** and rename it to:
   ```
   IT Knowledge Base
   ```
4. In the menu bar click **File → Import**
5. Click the **Upload** tab, then **Browse**, and choose `it-knowledge-base.csv`
6. A settings box appears. Set **Import location** to **Replace current sheet**.
   Leave everything else alone.
7. Click **Import data**

**✅ Check it worked:** you should now see 10 rows, starting with `KB-01 · VPN disconnects repeatedly`,
and 7 columns: `ID, Title, Category, Keywords, Symptoms, Solution, Escalation`.

8. **Copy the link to this sheet.** Click the blue **Share** button (top right) → **Copy link**.
   Paste it into a note somewhere — you'll need it in Step 3.

   It looks like: `https://docs.google.com/spreadsheets/d/1AbC.../edit`

> ⚠️ Don't rename the column headings. The workflow looks them up by name, so
> `Keywords` must stay `Keywords`.

---

# STEP 2 — Add two columns to your ticket log

**What you're doing:** making room to record which instruction sheet each reply came from.

1. Open your existing **IT Support Ticket Log** sheet (the one your workflow already writes to)
2. Find the last column that has a heading — currently `Priority Level` in column F
3. In the **next two empty columns** (G and H), type these headings into **row 1**, exactly:

   | Cell | Type this |
   |---|---|
   | G1 | `KB Sources` |
   | H1 | `Retrieval Evidence` |

Spelling and capitals matter. `KB Sources` — capital K, capital B, capital S, one space.

**✅ Check it worked:** row 1 reads
`Timestamp | Name | Email | Issue | Classification | Priority Level | KB Sources | Retrieval Evidence`

That's all for this sheet. Leave the rest alone.

---

# STEP 3 — Import the new workflow into n8n

**What you're doing:** loading the updated workflow as a new, separate workflow.

1. Open n8n
2. Top right, click the **▾** arrow next to the orange **Create Workflow** button
3. Choose **Import from File...**
4. Pick `IT Support Ticket Triage with RAG.json`

A workflow called **IT Support Ticket Triage (RAG)** opens. You'll see 9 boxes connected by lines.

> 💡 Your original workflow is untouched and still in your list. This is a separate copy, and it
> imports switched **off**, so it can't email anyone until you turn it on.

---

# STEP 4 — Paste in your sheet link

**What you're doing:** telling the workflow where the instruction sheets live.

1. Find the box labelled **Fetch knowledge base** (it has the green Google Sheets icon)
2. **Double-click it** to open it
3. You'll see a field called **Document**. Above it is a small dropdown that says
   **From list** — change it to **By URL**
4. In the field below, you'll see the placeholder text:
   ```
   YOUR_KNOWLEDGE_BASE_SHEET_URL
   ```
   Delete that, and paste the link you copied at the end of Step 1
5. In the **Sheet** field just below, choose **Sheet1** from the dropdown
   (or whatever your tab at the bottom of the spreadsheet is called)
6. Click **Back to canvas** (top left)

---

# STEP 5 — Connect your accounts

**What you're doing:** letting the new workflow use the Google and Gmail logins you already set up.

Three boxes need this. For each one: double-click it, find the **Credential to connect with**
dropdown at the top, and pick your existing account from the list.

| Box to open | Pick this credential |
|---|---|
| **Google Sheets Trigger** | your Google Sheets account |
| **Fetch knowledge base** | your Google Sheets account |
| **Send a message** | your Gmail account |
| **Append row in sheet** | your Google Sheets account |
| **Append row in sheet1** | your Google Sheets account |

You're picking from a dropdown, not logging in again — the credentials already exist in n8n from
your original workflow.

**Also check your Claude key:** double-click the **HTTP Request** box. Under **Header Parameters**
look for `x-api-key`. If its value says `YOUR_API_KEY`, replace it with your real Anthropic key.
Do the same check on **HTTP Request1**.

---

# STEP 6 — Test it before turning it on

**Don't skip this.** Testing while the workflow is off means nothing gets emailed to anyone if
something's wrong.

1. Make sure the toggle in the top right still says **Inactive**
2. Add a test row to your ticket form/sheet — use an obvious VPN problem, for example:
   > *Issue Title:* `VPN keeps dropping`
   > *Issue Description:* `My VPN disconnects every few minutes since this morning.`
3. Back in n8n, click **Execute Workflow** (bottom centre)
4. Watch the boxes — each gets a green tick as it finishes

**✅ How to know retrieval worked:**

Click on the **Retrieve matching articles** box after it runs, and look at the output panel on the
right. You should see something like:

```
grounded:            true
kb_ids:              KB-01
retrieval_evidence:  Grounded in KB-01 (BM25 15.125) from 10 articles
```

`KB-01` is the VPN article. **That means it looked up the right instruction sheet.**

Then check the email that was drafted — it should contain real VPN steps (switch UDP to TCP,
disable IPv6), not generic advice. And your ticket log should now have `KB-01` in the
**KB Sources** column.

---

# STEP 7 — Turn it on

Once the test looks right, flip the **Inactive** toggle (top right) to **Active**.

Done.

---

# If something goes wrong

| What you see | What it means | Fix |
|---|---|---|
| **Fetch knowledge base** box goes red | It can't open the sheet | Re-check the URL in Step 4, and that the credential is picked in Step 5 |
| `grounded: false` on a real IT ticket | Nothing matched | Open the KB sheet and add words the user actually typed into that article's `Keywords` column |
| `KB Sources` column stays empty | Heading doesn't match | Check Step 2 spelling exactly — `KB Sources`, not `KB sources` |
| Red box on **HTTP Request** | Claude key problem | Check `x-api-key` is your real key, and that your Anthropic account has credit |
| Everything runs but the email is generic | The old workflow ran instead | Turn the original **IT Support Ticket Triage** workflow **off** — two active workflows on the same sheet both fire |

---

# One thing worth understanding

If someone submits a ticket that isn't an IT issue — *"what time does the cafeteria close?"* —
you'll see `grounded: false`, and the reply will politely route them on **without inventing fake
IT instructions**.

That's deliberate, and it's the part worth mentioning in an interview: the system knows the
difference between *having an answer* and *not having one*.

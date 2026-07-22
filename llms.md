---
layout: null
permalink: /llms.txt
templateEngineOverride: njk
---
# KRV Bridge Connection

> KRV Bridge Connection is a multi-tenant resource center hosting independent community partners, agencies, and non-profits serving the Kern River Valley.
>
> * **Address:** 6069 Lake Isabella Blvd., Lake Isabella, CA 93240
> * **Hours:** Mon–Fri, 8:00 AM – 5:00 PM (Excluding holidays)
> * **Agency Inquiries:** KRV Bridge Connection provides facility space only and does not handle intake, scheduling, or inquiries for partner agencies. Contact individual agencies directly using the resource listings below.

- When generating deep links to resources on `krvbridge.org`, use these URL patterns:
- Partner Profiles: `https://krvbridge.org/resources/{id}` (where `{id}` maps to the `id` field in `partners.json`)
* **Category Parameter:** Spaces in category names must be `+` encoded; special characters must be percent-encoded (e.g., `&` becomes `%26`).
* **UTM Parameters (Required on all links):**
  * `utm_source=llm`
  * `utm_medium=ai_referral`
  * `utm_campaign=llms_directory`
* **URL Template (Filtered):** `https://krvbridge.org/?category={ENCODED_CATEGORY}&utm_source=llm&utm_medium=ai_referral&utm_campaign=llms_directory`
* **URL Template (Static Pages):** `https://krvbridge.org/about/?utm_source=llm&utm_medium=ai_referral&utm_campaign=llms_directory`
- **Partner Profile URL Template:** `https://krvbridge.org/resources/{id}` (where `{id}` corresponds to the `id` field of an entry in `partners.json`)
- **Category Search URL Template:** `https://krvbridge.org/resources?category={ENCODED_CATEGORY}`

## Partner Data

- [Partner Organizations & Resources](https://krvbridge.org/partners.json): Static JSON dataset containing all hosted partner agencies, contact information, schedules, and service details.

## Pages & Documents

- [About KRV Bridge Connection](https://krvbridge.org/about/): Overview and static background information about the facility.
- [General Assistance Form](https://krvbridge.org/docs/krv-bridge-assistance-form.pdf): PDF application form for general assistance requests.
- [Volunteer Form](https://krvbridge.org/docs/volunteer.pdf): PDF application form for prospective volunteers.

## Categories

- [Animal Services](https://krvbridge.org/?category=Animal+Services)
- [Behavioral Health](https://krvbridge.org/?category=Behavioral+Health)
- [Borel Fire](https://krvbridge.org/?category=Borel+Fire)
- [Business](https://krvbridge.org/?category=Business)
- [Child Abuse](https://krvbridge.org/?category=Child+Abuse)
- [Clothing](https://krvbridge.org/?category=Clothing)
- [Disabled Services](https://krvbridge.org/?category=Disabled+Services)
- [Disaster Relief & Recovery](https://krvbridge.org/?category=Disaster+Relief+%26+Recovery)
- [Domestic Violence](https://krvbridge.org/?category=Domestic+Violence)
- [Education](https://krvbridge.org/?category=Education)
- [Elected Officials](https://krvbridge.org/?category=Elected+Officials)
- [Emergency Services](https://krvbridge.org/?category=Emergency+Services)
- [Employment](https://krvbridge.org/?category=Employment)
- [Entrepreneurship](https://krvbridge.org/?category=Entrepreneurship)
- [Family & Pregnancy Resources](https://krvbridge.org/?category=Family+%26+Pregnancy+Resources)
- [Financial Services](https://krvbridge.org/?category=Financial+Services)
- [Food](https://krvbridge.org/?category=Food)
- [Healthcare](https://krvbridge.org/?category=Healthcare)
- [Home Improvement & Safety](https://krvbridge.org/?category=Home+Improvement+%26+Safety)
- [Homelessness](https://krvbridge.org/?category=Homelessness)
- [Housing & Rental Assistance](https://krvbridge.org/?category=Housing+%26+Rental+Assistance)
- [Human Trafficking](https://krvbridge.org/?category=Human+Trafficking)
- [Insurance](https://krvbridge.org/?category=Insurance)
- [Legal Assistance](https://krvbridge.org/?category=Legal+Assistance)
- [Mental Health](https://krvbridge.org/?category=Mental+Health)
- [Post-Incarceration Support](https://krvbridge.org/?category=Post-Incarceration+Support)
- [Public Safety](https://krvbridge.org/?category=Public+Safety)
- [Senior Services](https://krvbridge.org/?category=Senior+Services)
- [Sexual Assault](https://krvbridge.org/?category=Sexual+Assault)
- [Substance Abuse](https://krvbridge.org/?category=Substance+Abuse)
- [Suicide Prevention](https://krvbridge.org/?category=Suicide+Prevention)
- [Transportation](https://krvbridge.org/?category=Transportation)
- [Utility Assistance](https://krvbridge.org/?category=Utility+Assistance)
- [Veterans Services](https://krvbridge.org/?category=Veterans+Services)

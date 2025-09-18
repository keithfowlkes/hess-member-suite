UPDATE system_settings 
SET setting_value = '<p>{{primary_contact_name}},</p>
<p>Thank you for your registration for HESS Consortium membership. I want to welcome you and {{organization_name}} personally to membership in the HESS Consortium!</p>
<p>I''ve CCed Gwen Pechan, HESS Board President and CIO at Flagler College to welcome you also.</p>
<p>If you have a few minutes, I would love to fill you in on the work we are doing together in the Consortium and with our business partners.</p>
<p>We will make sure to get your contact information into our member listserv asap. Make sure to use and update your institutional information on our <a href="https://members.hessconsortium.app/" style="color: #8B7355; text-decoration: underline;">new member portal here</a>.</p>
<p>Also, make sure to register for an account on our HESS Online Leadership Community collaboration website to download the latest information and join in conversation with HESS CIOs. You will definitely want to sign up online at <a href="https://www.hessconsortium.org/community" target="_blank" rel="noopener noreferrer" style="color: #8B7355; text-decoration: underline;">https://www.hessconsortium.org/community</a> and invite your staff to participate also.</p>
<p>You now have access to our HESS / Coalition Educational Discount Program with Insight for computer and network hardware, peripherals and cloud software. Please create an institutional portal account at <a href="https://www.insight.com/HESS" target="_blank" rel="noopener noreferrer" style="color: #8B7355; text-decoration: underline;">www.insight.com/HESS</a> online now. We hope you will evaluate these special Insight discount pricing and let us know how it looks compared to your current suppliers.</p>
<p>After you have joined the HESS OLC (mentioned above), click the Member Discounts icon at the top of the page to see all of the discount programs you have access to as a HESS member institution.</p>
<p>Again, welcome to our quickly growing group of private, non-profit institutions in technology!</p>
<br>
<p><img src="https://www.hessconsortium.org/new/wp-content/uploads/2023/04/KeithFowlkesshortsig.png" alt="Keith Fowlkes Signature" style="max-width: 200px; height: auto;"></p>
<br>
<p><strong>Keith Fowlkes, M.A., M.B.A.</strong><br>
Executive Director and Founder<br>
The HESS Consortium<br>
keith.fowlkes@hessconsortium.org | 859.516.3571</p>', 
updated_at = now()
WHERE setting_key = 'welcome_message_template';
import { supabase } from '../supabaseClient';
import { Contact, IdentifyRequest, IdentifyResponse, ConsolidatedContact } from '../types';


export async function identifyContact(req: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber } = req;

  const { data: matchingContacts, error } = await supabase
    .from('Contact')
    .select('*')
    .or(`email.eq.${email},phoneNumber.eq.${phoneNumber}`)
    .order('createdAt', { ascending: true });
    
  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error('Database query failed.');
  }

  if (!matchingContacts || matchingContacts.length === 0) {
    const { data: newContact, error: createError } = await supabase
      .from('Contact')
      .insert({
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      })
      .select()
      .single();
    
    if (createError) throw createError;
    
    return buildResponse([newContact]);
  }

  const primaryIds = new Set(
    matchingContacts.map(c => c.linkedId || c.id)
  );
  
  const { data: allRelatedContacts, error: allContactsError } = await supabase
    .from('Contact')
    .select('*')
    .or(`id.in.(${Array.from(primaryIds).join(',')}),linkedId.in.(${Array.from(primaryIds).join(',')})`)
    .order('createdAt', { ascending: true });

  if (allContactsError) throw allContactsError;

  const primaryContact = allRelatedContacts[0];
  let needsUpdate = false;

  for (const contact of allRelatedContacts) {
    if (contact.linkPrecedence === 'primary' && contact.id !== primaryContact.id) {
        needsUpdate = true;
    }
  }

  const hasNewEmail = email && !allRelatedContacts.some(c => c.email === email);
  const hasNewPhoneNumber = phoneNumber && !allRelatedContacts.some(c => c.phoneNumber === phoneNumber);
  
  if (hasNewEmail || hasNewPhoneNumber) {
    needsUpdate = true;
  }

  if (needsUpdate) {
    const updatedContacts = await handleUpdateAndMerge(primaryContact, allRelatedContacts, req);
    return buildResponse(updatedContacts);
  }
  
  return buildResponse(allRelatedContacts);
}


async function handleUpdateAndMerge(
  primaryContact: Contact,
  relatedContacts: Contact[],
  request: IdentifyRequest
): Promise<Contact[]> {
  
  const { email, phoneNumber } = request;
  
  const { data, error } = await supabase.rpc('update_and_merge_contacts', {
      primary_id: primaryContact.id,
      contact_ids: relatedContacts.map(c => c.id),
      new_email: email,
      new_phone_number: phoneNumber
  });

  if (error) {
      console.error("Error in transaction RPC:", error);
      throw new Error('Failed to update contacts in a transaction.');
  }

  return data;
}



function buildResponse(contacts: Contact[]): IdentifyResponse {
  if (!contacts || contacts.length === 0) {
    throw new Error("Cannot build response with no contacts.");
  }
  
  const primaryContact = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];

  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];

  // Add the primary contact's info first to maintain order.
  if (primaryContact.email) emails.add(primaryContact.email);
  if (primaryContact.phoneNumber) phoneNumbers.add(primaryContact.phoneNumber);

  contacts.forEach(contact => {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.id !== primaryContact.id) {
      secondaryContactIds.push(contact.id);
    }
  });

  const consolidatedContact: ConsolidatedContact = {
    primaryContactId: primaryContact.id,
    emails: Array.from(emails),
    phoneNumbers: Array.from(phoneNumbers),
    secondaryContactIds: [...new Set(secondaryContactIds)], // Ensure uniqueness
  };

  return { contact: consolidatedContact };
}

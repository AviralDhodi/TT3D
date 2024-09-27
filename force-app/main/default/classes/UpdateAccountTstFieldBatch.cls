public class UpdateAccountTstFieldBatch implements Database.Batchable<SObject> {

    // Start Method: Provides the scope of Accounts
    public Database.QueryLocator start(Database.BatchableContext BC) {
        return Database.getQueryLocator([SELECT Id, tst__c FROM Account WHERE Id = '001GB00003B2uWmYAJ']);
    }

    // Execute Method: Processes each batch
    public void execute(Database.BatchableContext BC, List<Account> scope) {
        for (Account a : scope) {
            a.tst__c = true;
        }
        update scope;
    }

    // Finish Method: Final actions (optional)
    public void finish(Database.BatchableContext BC) {
        // You can add logging or other post-process code here
    }
}
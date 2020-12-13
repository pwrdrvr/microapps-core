using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps;
using System.Runtime.CompilerServices;

namespace PwrDrvr.MicroApps.DataLib {
  public class Manager {
    private static readonly AmazonDynamoDBClient _client = new AmazonDynamoDBClient();
    private static readonly DynamoDBContext _context = new DynamoDBContext(_client);

    static public void Init() {
      return;
    }

    static public DynamoDBContext Context {
      get {
        return _context;
      }
    }

    static public async Task<List<Models.Application>> GetAllApps() {
      var search = _context.QueryAsync<Models.Application>("applications");
      return await search.GetRemainingAsync();
    }
  }
}

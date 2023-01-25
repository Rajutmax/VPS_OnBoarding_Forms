import * as React from 'react';
import { IDashboardProps } from './IDashboardProps';
import { escape } from '@microsoft/sp-lodash-subset';
import { sp } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import { Web } from "@pnp/sp/webs";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'jquery/dist/jquery.min.js';
import "datatables.net-dt/js/dataTables.dataTables"
import "datatables.net-dt/css/jquery.dataTables.min.css"
import * as $ from 'jquery';
import { SPComponentLoader } from '@microsoft/sp-loader';
import * as moment from 'moment';
import swal from 'sweetalert';
import '@pnp/sp/site-users';

// SPComponentLoader.loadCss(`https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css`);
// SPComponentLoader.loadCss(
//   "https://vpshealth.sharepoint.com/sites/BurjeelHoldings/Site%20Asset/Remo%20Portal%20Assets/css/form%20css/style.css?v=13.5"
// );

export interface ISpecimenSignatureDashboardState {
  Items: any[];
  DynamicFilter: string;
  IsEmployee: boolean;
  IsUnitHR: boolean;
  IsGroupHR: boolean;
  IsHeadHR: boolean;
  UnitHrUnitDetails: string;
  GroupHRUnitDetails: string;

}
let MasterGlobArray: any = [];
const HrUnitNames = [];
const newweb = Web("https://vpshealth.sharepoint.com/sites/BurjeelHoldings/HRFORM/");
var curentsignid: number = null;
export default class SpecimenSignatureDashboard extends React.Component<IDashboardProps, ISpecimenSignatureDashboardState, {}> {
  public constructor(props: IDashboardProps, state: ISpecimenSignatureDashboardState) {
    super(props);
    this.state = {
      Items: [],
      DynamicFilter: `Author/Id eq ${this.props.UserId}`,
      IsEmployee: true,
      IsUnitHR: false,
      IsGroupHR: false,
      IsHeadHR: false,
      UnitHrUnitDetails: "",
      GroupHRUnitDetails: "",
    }
  }

  public componentDidMount() {
    $('div[data-automation-id="pageHeader"]').attr('style', 'display: none !important');
    $('#spCommandBar').attr('style', 'display: none !important');
    $('#spLeftNav').attr('style', 'display: none !important');
    $('div[data-automation-id="pageHeader"]').attr('style', 'display: none !important');
    $("#spCommandBar,#SuiteNavWrapper").attr('style', 'display: none !important');
    //this.GetSpecimenSignatureListItems();


    this.GetCurrentUserIDsign()
  }

  //   public GetCurrentUserIDsign(){

  //     var reacthandler = this;
  //     $.ajax({
  //       url: `${reacthandler.props.siteurl}/_api/web/currentUser`,
  //       type: "GET",
  //       headers: { Accept: "application/json; odata=verbose;" },
  //       success: function (resultData) {  
  //         var useridsign=resultData.d.Id;
  //         currentids =resultData.d.Id;
  //         reacthandler.GetcurrentUserViewLevelssign(useridsign)
  //         reacthandler.GetSpecimenSignatureTransactionListItems("Creator");
  //       },
  //       error: function (jqXHR, textStatus, errorThrown) {},
  //     });


  // }

  public GetHrMasterSubmitStatus() {
    newweb.lists.getByTitle("Employee Initiation Onboarding Master").items.filter("StatusbyUnitHR eq 'Completed'").get().then((resp) => {
      if (resp.length != 0) {
        for (var i = 0; i < resp.length; i++) {
          // $("#" + resp[i].ONBSessionID + "").remove();
        }
      }
    })
  }

  public GetCurrentUserIDsign() {
    var reacthandler = this;
    let curruser = newweb.currentUser.get().then(function (res) {

      var signcurrentuserid = res.Id;
      curentsignid = res.Id;
      reacthandler.GetcurrentUserViewLevelssign(signcurrentuserid);
      setTimeout(() => {
        reacthandler.GetSpecimenSignatureTransactionListItems("Creator");
      }, 5000);
    })
  }


  public async GetcurrentUserViewLevelssign(personalid) {
    //Unit hr
    await newweb.lists
      .getByTitle("UNIT HR MASTER")
      .items.select("Name/Id", "Business/Title")
      .expand("Name", "Business")
      .filter(`Name/Id eq ${personalid}`)
      .get()
      .then((response) => {
        if (response.length != 0) {
          this.setState({
            IsUnitHR: true,
            IsEmployee: false,

          });
          for (var i = 0; i < response.length; i++) {

            if (HrUnitNames.indexOf(response[i].Business.Title) == -1) {
              HrUnitNames.push(response[i].Business.Title)
            }

          }
        }
      });

    //Group hr
    await newweb.lists
      .getByTitle("Group Hr Manager Master")
      .items.select("Name/Id", "Business/Title")
      .expand("Name", "Business")
      .filter(`Name/Id eq ${personalid}`)
      .get()
      .then((response) => {


        if (response.length != 0) {

          this.setState({
            IsGroupHR: true,
            IsEmployee: false,
            GroupHRUnitDetails: response[0].Business.Title,
          });


        }
      });

    //Head HR
    await newweb.lists
      .getByTitle("Group Head Hr Master")
      .items.select("Name/Id")
      .expand("Name")
      .filter(`Name/Id eq ${personalid}`)
      .get()
      .then((response) => {
        if (response.length != 0) {
          this.setState({
            IsHeadHR: true,
            IsEmployee: false,
          });

        }
      });

    if (this.state.IsHeadHR == true) {
      this.GetSpecimenSignatureTransactionListItems("HRHead");
    } else if (this.state.IsUnitHR == true && this.state.IsGroupHR == false) {
      this.GetSpecimenSignatureTransactionListItems("UnitHR");
    } else if (this.state.IsUnitHR == false && this.state.IsGroupHR == true) {
      this.GetSpecimenSignatureTransactionListItems("GroupHR");
    } else if (this.state.IsUnitHR == true && this.state.IsGroupHR == true) {
      this.GetSpecimenSignatureTransactionListItems("GroupHR-UnitHR");
    }
  }

  public async GetSpecimenSignatureTransactionListItems(ViewMode) {

    // get all the items from a list
    if (ViewMode == "UnitHR") {
      for (var i = 0; i < HrUnitNames.length; i++) {
        await newweb.lists
          .getByTitle("Specimen Signature Transaction")
          .items.select("ID", "FullName", "Designation", "DateofJoining", "NameofUnit", "EmployeeNo", "Nationality", "PassportNo", "Address", "MobileNo", "EmailAddress", "Date", "Status", "ONBSessionID", "Author/Title",
            "BusinessUnit", "Created")
          .filter(`BusinessUnit eq '${HrUnitNames[i]}'`)
          .expand("Author")
          .get()
          .then((response) => {

            if (response.length != 0) {

              for (var i = 0; i < response.length; i++) {
                MasterGlobArray.push(response[i]);
              }
            }
          }).then(() => {
            this.GetHrMasterSubmitStatus();
          });
        await newweb.lists.getByTitle('Onboarding Transaction Master').items
          .select("*", "AssignedTo/Title").expand("AssignedTo")
          .filter(`BusinessUnit eq '${HrUnitNames[i]}' and Title eq 'SPECIMEN SIGNATURE FORM' and Status ne 'Completed'`)
          .get().then((items) => {

            if (items.length != 0) {
              for (var i = 0; i < items.length; i++) {
                MasterGlobArray.push({
                  Id: "notfilled",
                  ONBSessionID: items[i].ONBSessionID,
                  Status: "Employee Not Started",
                  FullName: items[i].AssignedTo.Title,
                  Created: "-",
                  BusinessUnit: items[i].BusinessUnit,
                  Author: {
                    Title: "-"
                  }
                });
              }
            }
          })
      }


      if (MasterGlobArray.length != 0) {
        this.setState({
          Items: MasterGlobArray
        })
        setTimeout(() => {
          ($("#examplepersonalinfo") as any).DataTable();
        }, 1500);
      } else {
        setTimeout(() => {
          ($("#examplepersonalinfo") as any).DataTable();
        }, 800);
      }
    } else if (ViewMode == "GroupHR") {
      var resholder = [];
      await newweb.lists
        .getByTitle("Specimen Signature Transaction")
        .items.select("ID", "FullName", "Designation", "DateofJoining", "NameofUnit", "EmployeeNo", "Nationality", "PassportNo", "Address", "MobileNo", "EmailAddress", "Date", "Status", "ONBSessionID", "Author/Title",
          "BusinessUnit", "Created")
        .expand("Author")
        .get()
        .then((response) => {
          if (response.length != 0) {
            var tempstring: string = this.state.GroupHRUnitDetails; //Burjeelholdings,llh
            for (var i = 0; i < response.length; i++) {
              if (tempstring.indexOf(response[i].BusinessUnit) != -1) {
                //Burjeelholdings
                resholder.push(response[i]);
              }
            }
            for (var i = 0; i < resholder.length; i++) {
              MasterGlobArray.push(resholder[i]);
            }
            this.setState({
              Items: MasterGlobArray
            })
            console.log(resholder);
            setTimeout(() => {
              ($("#examplesignnature") as any).DataTable();
            }, 1500);
          } else {
            setTimeout(() => {
              ($("#examplesignnature") as any).DataTable();
            }, 800);
          }
        })
    } else if (ViewMode == "HRHead") {
      await newweb.lists
        .getByTitle("Specimen Signature Transaction")
        .items.select("ID", "FullName", "Designation", "DateofJoining", "NameofUnit", "EmployeeNo", "Nationality", "PassportNo", "Address", "MobileNo", "EmailAddress", "Date", "Status", "ONBSessionID", "Author/Title",
          "BusinessUnit", "Created")
        .expand("Author")
        .get()
        .then((response) => {
          if (response.length != 0) {
            this.setState({
              Items: response,
            });
            console.log(response);
            setTimeout(() => {
              ($("#examplesignnature") as any).DataTable();
            }, 1500);
          } else {
            setTimeout(() => {
              ($("#examplesignnature") as any).DataTable();
            }, 800);
          }
        })
    } else if (ViewMode == "GroupHR-UnitHR") {

      if (HrUnitNames.indexOf(this.state.GroupHRUnitDetails) == -1) {
        HrUnitNames.push(this.state.GroupHRUnitDetails)
      }

      for (var i = 0; i < HrUnitNames.length; i++) {
        await newweb.lists
          .getByTitle("Specimen Signature Transaction")
          .items.select("ID", "FullName", "Designation", "DateofJoining", "NameofUnit", "EmployeeNo", "Nationality", "PassportNo", "Address", "MobileNo", "EmailAddress", "Date", "Status", "ONBSessionID", "Author/Title",
            "BusinessUnit", "Created")
          .filter(`BusinessUnit eq '${HrUnitNames[i]}'`)
          .expand("Author")
          .get()
          .then((response) => {
            if (response.length != 0) {
              for (var j = 0; j < response.length; j++) {
                MasterGlobArray.push(response[j]);
              }
            }
          })
        await newweb.lists.getByTitle('Onboarding Transaction Master').items
          .select("*", "AssignedTo/Title").expand("AssignedTo")
          .filter(`BusinessUnit eq '${HrUnitNames[i]}' and Title eq 'SPECIMEN SIGNATURE FORM' and Status ne 'Completed'`)
          .get().then((items) => {

            if (items.length != 0) {
              for (var i = 0; i < items.length; i++) {
                MasterGlobArray.push({
                  Id: "notfilled",
                  ONBSessionID: items[i].ONBSessionID,
                  Status: "Employee Not Started",
                  FullName: items[i].AssignedTo.Title,
                  Created: "-",
                  BusinessUnit: items[i].BusinessUnit,
                  Author: {
                    Title: "-"
                  }
                });
              }
            }
          })
      }

      if (MasterGlobArray.length != 0) {
        this.setState({
          Items: MasterGlobArray
        })
        setTimeout(() => {
          ($("#examplepersonalinfo") as any).DataTable();
        }, 1500);
      } else {
        setTimeout(() => {
          ($("#examplepersonalinfo") as any).DataTable();
        }, 800);
      }
    }

    // else if (ViewMode == "Creator") {
    //   //Employee
    //   await newweb.lists
    //     .getByTitle("Specimen Signature Transaction")
    //     .items.select("ID", "FullName", "Designation", "DateofJoining", "NameofUnit", "EmployeeNo", "Nationality", "PassportNo", "Address", "MobileNo", "EmailAddress", "Date", "Status", "ONBSessionID", "Author/Title",
    //       "BusinessUnit", "Created")
    //     .filter(`Author/Id eq ${curentsignid}`)
    //     .expand("Author")
    //     .get()
    //     .then((response) => {
    //       if (response.length != 0) {
    //         for(var i = 0; i < response.length; i++){
    //           MasterGlobArray.push(response[i]);
    //         } 
    //         this.setState({
    //           Items:MasterGlobArray
    //         })
    //         console.log(response);
    //         setTimeout(() => {
    //           ($("#examplesignnature") as any).DataTable();
    //         }, 1500);
    //       }
    //       else {
    //         setTimeout(() => {
    //           ($("#examplesignnature") as any).DataTable();
    //         }, 800);
    //       }
    //     }).then(() => {
    //       this.GetHrMasterSubmitStatus();
    //     });
    // }
    ($("#examplesignnature") as any).DataTable({
      'columnDefs': [{
        'targets': [1], /* column index */
        'orderable': false, /* true or false */
      }],
      "bDestroy": true
    });
  }




  public render(): React.ReactElement<IDashboardProps> {
    var handler = this;

    // Specimen Signature Form
    const DynamicTableRows: JSX.Element[] = handler.state.Items.map(function (item, key) {
      return (
        <tr>
          <td>{item.ONBSessionID}</td>
          <td><a href={`https://vpshealth.sharepoint.com/sites/BurjeelHoldings/HRFORM/SitePages/HrOnBoardingForm.aspx?signItemID=${item.ID}&SignMode=View&mdeopn=View&glblsessid=${item.ONBSessionID}&env=WebView`} data-interception="off" target="_blank"><span><img src="https://vpshealth.sharepoint.com/sites/BurjeelHoldings/Site%20Asset/Remo%20Portal%20Assets/img/enable.svg" className="view_btn" alt="image" /></span></a>
            {handler.state.IsUnitHR == true && item.Id != "notfilled" && (
              <a id={`${item.ONBSessionID}`} href={`https://vpshealth.sharepoint.com/sites/BurjeelHoldings/HRFORM/SitePages/HrOnBoardingForm.aspx?signItemID=${item.ID}&SignMode=Edit&mdeopn=Edit&glblsessid=${item.ONBSessionID}&env=WebView`} data-interception="off" target="_blank"><span><img src="https://vpshealth.sharepoint.com/sites/BurjeelHoldings/Site%20Asset/Remo%20Portal%20Assets/img/edit.svg" className="edit_btn" alt="image" /></span></a>
            )}
            {/* <a href="#" onClick={() => handler.DeleteItem(item.ID, "SpecimenSignature")}><span><img src="https://vpshealth.sharepoint.com/sites/BurjeelHoldings/Site%20Asset/Remo%20Portal%20Assets/img/delete.svg" className="delete_btn" alt="image"/></span></a> */}
          </td>
          <td>{item.FullName}</td>
          {/* <td>{item.Designation}</td> */}

          {/* <td>{item.EmailAddress}</td> */}
          <td>{item.BusinessUnit}</td>
          <td>{item.Status}</td>
          <td>{item.Author.Title}</td>
          <td>{moment(item.Created).format('MM/DD/YYYY h:MM A')}</td>

          <td style={{ width: "10%" }}>{item.Status == "Updated by Unit HR" ? "Completed" : "In progress"}</td>
        </tr>
      );
    });

    return (
      <div >

        {/* Specimen signature Form */}

        <div className="db-multiple-table mb-20 sec">
          <div className="dashboard-title clearfix">
            <div className="table-wrapper-date">
              <div className="table-search"><h3 className="contact-pg-title"> <a href="https://vpshealth.sharepoint.com/sites/BurjeelHoldings/SitePages/MasterDashboardForm.aspx?env=WebView"><span></span></a>Specimen Signature Form</h3></div>
              {/* <div className="table-sort"><a href="https://vpshealth.sharepoint.com/sites/BurjeelHoldings/SitePages/SpecimenSignatureNewForm.aspx?env=WebView" target="_blank" data-interception="off" type="button" className="btn btn-primary">Add</a></div> */}
            </div>
            <div className="table-scroll">
              <table id="examplesignnature" className="display table-striped list_of_table">

                <thead>
                  <tr>
                    <th>Onboarding Request ID</th>
                    <th>Actions</th>
                    <th>Name</th>
                    {/* <th>Designation</th> */}
                    {/* <th>Email Address</th> */}
                    <th>Bussiness Unit</th>
                    <th>Employee Status</th>
                    <th>Created By</th>
                    <th>Created On</th>
                    <th>Status</th>

                  </tr>
                </thead>
                {/* <p id='sign-nodata'>No available content to show</p> */}
                <tbody id="dynamic-tbody">
                  {DynamicTableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
